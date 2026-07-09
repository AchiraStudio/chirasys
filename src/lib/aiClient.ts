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
      content: `You are a helpful, extremely capable AI assistant integrated directly into ChiraSYS (a Point of Sale & Inventory Management system). 
Current User Context:
- Username: ${user.username}
- Role: ${user.role}
- Branch ID: ${branchId}

You have access to tools that can control the application directly. 
When a user asks you to perform an action (like checking stock, adding a promo, updating a price), ALWAYS use the tools.
Do not tell the user how to do it manually if you have a tool for it; just do it.
If a tool returns an error about Permission Denied, gracefully explain to the user that their current role (${user.role}) does not allow this action.`
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
        model: 'gpt-4o-mini', // Can be configurable later
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
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type === 'function') {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          const result = await executeTool(functionName, functionArgs, {
            branchId,
            userId: user.id,
            role: user.role
          });

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
    throw error;
  }
}
