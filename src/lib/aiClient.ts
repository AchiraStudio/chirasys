import { aiTools, executeTool } from './aiTools';
import { useAuthStore, UserInfo } from '../store/AuthStore';
import { invoke } from '@tauri-apps/api/core';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

function buildConversationPrompt(messages: ChatMessage[], user: UserInfo, branchId: string): ChatMessage[] {
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

  const systemMsg = conversation.find(m => m.role === 'system');
  const otherMsgs = conversation.filter(m => m.role !== 'system');
  const recentMsgs = otherMsgs.slice(-10);
  return systemMsg ? [systemMsg, ...recentMsgs] : recentMsgs;
}

async function fetchChatCompletion(conversation: ChatMessage[], apiKey?: string): Promise<any> {
  try {
    return await invoke('send_ai_chat_request', {
      request: {
        model: 'gpt-4o',
        messages: conversation,
        tools: aiTools,
        tool_choice: 'auto',
        api_key: apiKey || undefined,
      }
    });
  } catch (tauriError: any) {
    if (!apiKey) {
      throw new Error('OpenAI API Key is not configured in the .env file (VITE_OPENAI_API_KEY). ' + (tauriError?.message || String(tauriError)));
    }

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

    return await response.json();
  }
}

async function processToolCall(toolCall: any, user: UserInfo, branchId: string): Promise<ChatMessage> {
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
    result = { error: execError.message || String(execError) };
  }

  let contentStr = JSON.stringify(result);
  if (contentStr.length > 3000) {
    contentStr = contentStr.substring(0, 3000) + '... (truncated)';
  }

  return {
    role: 'tool',
    tool_call_id: toolCall.id,
    name: functionName,
    content: contentStr
  };
}

/**
 * Send a chat completion request to OpenAI with the current conversation history.
 * If the model returns a tool call, we execute it locally and send the result back (recursive loop).
 */
export async function sendChatRequest(messages: ChatMessage[], branchId: string): Promise<ChatMessage[]> {
  const { user } = useAuthStore.getState();
  if (!user) throw new Error('Not logged in');

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  let conversation = buildConversationPrompt(messages, user, branchId);

  const data = await fetchChatCompletion(conversation, apiKey);
  const assistantMessage = data.choices[0].message;
  conversation.push(assistantMessage);

  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type === 'function') {
        const toolMsg = await processToolCall(toolCall, user, branchId);
        conversation.push(toolMsg);
      }
    }
    return sendChatRequest(conversation, branchId);
  }

  return conversation;
}