import { aiTools, executeTool } from './aiTools';
import { useAuthStore } from '../store/AuthStore';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Send a chat completion request to OpenAI with the current conversation history.
 * If the model returns a tool call, we execute it locally and send the result back (recursive loop).
 */
export async function sendChatRequest(messages: ChatMessage[], branchId: string): Promise<ChatMessage[]> {
  const { user } = useAuthStore.getState();
  if (!user) throw new Error('Not logged in');

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API Key is not configured in the .env file (VITE_OPENAI_API_KEY).');
  }

  // Inject system context if it's the first call and not already present
  let conversation = [...messages];
  const hasSystem = conversation.some(m => m.role === 'system');
  if (!hasSystem) {
    conversation.unshift({
      role: 'system',
      content: `Kamu adalah Achira, asisten AI cerdas untuk sistem ERP & POS ChiraSYS.
Pengguna: ${user.username} | Role: ${user.role} | Branch: ${branchId}

Aturan:
- Gunakan format Markdown (bold, italic, list) dalam jawabanmu.
- Kamu punya akses ke tools untuk mengontrol aplikasi. SELALU gunakan tools jika diminta tindakan (cek stok, buat promo, ubah harga, dll).
- Jangan menyuruh pengguna melakukan manual jika kamu bisa melakukannya.
- Jika tools mengembalikan error Permission Denied, jelaskan bahwa role '${user.role}' tidak punya izin.
- Untuk promo bundle: gunakan tool create_promo dengan promo_type='bundle', bundle_items berisi array item, applies_to='item', dan sertakan discount_percent atau discount_value.
- Saat membuat bundle, kamu TIDAK perlu mengisi item_id tunggal — cukup isi bundle_items saja.`
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: conversation,
        tools: aiTools,
        tool_choice: 'auto'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI Error: ${response.status} ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;
    conversation.push(assistantMessage);

    // If the model called tools, execute them and recurse
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Validate that all tool calls have unique IDs
      const toolCallIds = assistantMessage.tool_calls.map((tc: any) => tc.id);
      const uniqueIds = new Set(toolCallIds);
      if (uniqueIds.size !== toolCallIds.length) {
        throw new Error('Duplicate tool_call_id detected. Please retry.');
      }

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type === 'function') {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          let result;
          try {
            result = await executeTool(functionName, functionArgs, {
              branchId,
              userId: user.id,
              role: user.role
            });
          } catch (execError: any) {
            // Jika eksekusi gagal, kirimkan error sebagai pesan tool
            result = { error: execError.message || String(execError) };
          }

          // Selalu tambahkan pesan tool response, baik sukses maupun error
          conversation.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: JSON.stringify(result)
          });
        }
      }
      
      // Recursive call with the new tool results so the model can generate a final answer
      return sendChatRequest(conversation, branchId);
    }

    // No more tool calls, return the final conversation
    return conversation;

  } catch (error: any) {
    // Tangani error jaringan atau API
    throw new Error(error.message || 'Terjadi kesalahan saat menghubungi AI.');
  }
}