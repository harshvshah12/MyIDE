import { NextRequest, NextResponse } from 'next/server';
import { getProjectMemory, addDecision } from '@/lib/storage';

export async function GET() {
  try {
    const memory = getProjectMemory();
    return NextResponse.json({ success: true, memory });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load project memory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question required' }, { status: 400 });
    }

    const memory = getProjectMemory();
    const qLower = question.toLowerCase();

    // Contextual query resolution based on project memory
    let answer = '';
    if (qLower.includes('monaco') || qLower.includes('editor')) {
      const dec = memory.decisions.find((d) => d.id === 'dec-1');
      answer = `We decided to adopt Monaco Editor (${dec?.date}):\n\n- **Decision**: ${dec?.decision}\n- **Why**: ${dec?.why}\n- **Consequences**: ${dec?.consequences}\n\nThis gives student developers VS Code keybindings, native TypeScript/Python syntax support, and side-by-side diff review directly in the browser.`;
    } else if (qLower.includes('credential') || qLower.includes('capabilit') || qLower.includes('secret')) {
      const dec = memory.decisions.find((d) => d.id === 'dec-2');
      answer = `We separated credentials from capabilities (${dec?.date}):\n\n- **Decision**: ${dec?.decision}\n- **Why**: ${dec?.why}\n- **Consequences**: ${dec?.consequences}\n\nTeammates can share model access without ever seeing or transmitting raw API keys.`;
    } else if (qLower.includes('stack') || qLower.includes('technolog')) {
      answer = `Adopted Project Stack:\n${memory.stack.map((s) => `• ${s}`).join('\n')}\n\nArchitecture: ${memory.architecture}`;
    } else if (qLower.includes('convention') || qLower.includes('rule')) {
      answer = `Team Coding Conventions:\n${memory.conventions.map((c) => `• ${c}`).join('\n')}`;
    } else {
      // General synthesis from decisions
      const matching = memory.decisions.filter(
        (d) =>
          d.title.toLowerCase().includes(qLower) ||
          d.why.toLowerCase().includes(qLower) ||
          d.tags.some((t) => qLower.includes(t))
      );

      if (matching.length > 0) {
        answer = `Found relevant architectural decisions:\n\n` +
          matching
            .map(
              (m) =>
                `**${m.title}** (${m.date})\nDecision: ${m.decision}\nRationale: ${m.why}`
            )
            .join('\n\n');
      } else {
        answer = `Based on Project Memory, our system follows a "${memory.architecture}" architecture. Active stack includes: ${memory.stack.join(', ')}. conventions: ${memory.conventions.join('; ')}.`;
      }
    }

    return NextResponse.json({ success: true, answer });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'QA failed' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, decision, why, consequences, tags } = body;

    const newDec = addDecision({
      date: new Date().toISOString().split('T')[0],
      title,
      decision,
      why,
      consequences: consequences || 'None documented',
      tags: tags || ['architecture'],
    });

    return NextResponse.json({ success: true, decision: newDec });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add decision' },
      { status: 500 }
    );
  }
}
