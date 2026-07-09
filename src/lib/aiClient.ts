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
  if (conversation[0]?.role !== 'system') {
    conversation.unshift({
      role: 'system',
      content: `Nama kamu adalah Achira, asisten AI yang sangat cerdas, ramah, dan terintegrasi langsung ke dalam sistem ERP & POS ChiraSYS.
Konteks Pengguna Saat Ini:
- Username: ${user.username}
- Role: ${user.role}
- Branch ID: ${branchId}

Gunakan format Markdown untuk memperjelas jawabanmu (gunakan **bold**, *italic*, dan list).
Kamu memiliki akses ke alat (tools) yang dapat mengontrol aplikasi secara langsung. 
Jika pengguna memintamu melakukan suatu tindakan (seperti mengecek stok, membuat promo, mengubah harga), SELALU gunakan alat tersebut.
Jangan menyuruh pengguna melakukannya secara manual jika kamu memiliki alat untuk itu; langsung lakukan saja.
Jika sebuah alat mengembalikan error tentang Permission Denied, jelaskan dengan sopan bahwa peran mereka saat ini (${user.role}) tidak mengizinkan tindakan tersebut.`
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
        model: 'gpt-4o-mini',
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