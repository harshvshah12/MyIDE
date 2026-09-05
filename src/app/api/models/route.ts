import { NextResponse } from 'next/server';

export async function GET() {
  const models = [
    {
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash High',
      provider: 'google',
      contextWindow: 1048576,
      costTier: 'low',
      reasoningScore: 8.5,
      speedScore: 9.8,
      status: 'configured',
      description: 'Ultra-fast low-latency reasoning model; ideal for rapid code generation & inline assistance.',
      isDefault: true,
    },
    {
      id: 'gemini-3.7-flash',
      name: 'Gemini 3.7 Flash High',
      provider: 'google',
      contextWindow: 1048576,
      costTier: 'low',
      reasoningScore: 8.2,
      speedScore: 9.5,
      status: 'configured',
      description: 'High-throughput reasoning model with thinking capabilities for complex workflows.',
    },
    {
      id: 'claude-3-7-sonnet',
      name: 'Claude 3.7 Sonnet',
      provider: 'anthropic',
      contextWindow: 200000,
      costTier: 'high',
      reasoningScore: 9.9,
      speedScore: 7.8,
      status: 'configured',
      description: 'Premier architectural reasoning, deep multi-file refactoring, and security verification.',
    },
    {
      id: 'gpt-4o',
      name: 'OpenAI GPT-4o',
      provider: 'openai',
      contextWindow: 128000,
      costTier: 'medium',
      reasoningScore: 9.0,
      speedScore: 8.4,
      status: 'configured',
      description: 'Balanced multimodal model with strong function calling and tool execution.',
    },
    {
      id: 'llama-3.3-70b-local',
      name: 'Ollama LLaMA 3.3 70B (Local)',
      provider: 'local',
      contextWindow: 32000,
      costTier: 'free',
      reasoningScore: 8.0,
      speedScore: 7.2,
      status: 'local_online',
      description: 'Zero-cost offline inference running via local GPU without cloud dependency.',
    },
  ];

  return NextResponse.json({ success: true, models });
}
