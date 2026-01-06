import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { Client } from "@notionhq/client";
import { NotionClient } from "@/lib/notion/client";
import { settingsStore } from "@/lib/store/settings-store";
import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

// rich schema for relationship intelligence
const contactSchema = z.object({
	name: z.string(),
	company: z.string().optional(),
	lastInteraction: z.string(),
	sentiment: z.number(), // -1 to 1
	topics: z.array(z.string()),
	nextSteps: z.array(z.string()),
});

const relationshipIntelligence = z.object({
	contacts: z.array(contactSchema),
	insights: z.object({
		followUps: z.array(z.string()),
		opportunities: z.array(z.string()),
	}),
});

async function analyzeRelationships(
	recentLogs: string,
	aiPreset: ReturnType<typeof settingsStore.getPreset>,
): Promise<z.infer<typeof relationshipIntelligence>> {

	if (!aiPreset) {
		throw new Error("ai preset not found");
	}

	const prompt = `你是一位专业的关系智能分析师。你的任务是分析工作日志并生成一份全面的关系智能报告。

    分析目标：
    1. 提取提到的所有个人，包括其全名和组织机构
    2. 确定每次互动的性质和质量（积极、中立、消极）
    3. 根据互动语境计算情感得分（-1 到 1）
    4. 识别重复出现的讨论主题及其重要性
    5. 识别潜在的商业机会和合作可能性
    6. 为每位联系人建议具体、可操作的后续步骤

    上下文：
    今天的日期：${new Date().toISOString().split("T")[0]}
    当前时间：${new Date().toLocaleTimeString()}
    时区：${Intl.DateTimeFormat().resolvedOptions().timeZone}

    待分析的工作日志：
    ${recentLogs}

    响应格式：
    返回具有以下结构的 JSON 对象：
    {
      "contacts": [
        {
          "name": "全名",
          "company": "组织名称",
          "lastInteraction": "YYYY-MM-DD",
          "sentiment": 0.X, // 范围从 -1.0（消极）到 1.0（积极）
          "topics": ["主题1", "主题2", "主题3"],
          "nextSteps": ["具体行动 1", "具体行动 2"]
        },
        // 其他联系人...
      ],
      "insights": {
        "followUps": ["优先后续行动 1", "优先后续行动 2"],
        "opportunities": ["商业机会 1", "商业机会 2"]
      }
    }

    重要提示：
    - 仅使用日志中发现的真实姓名和公司
    - 确保情感得分准确反映互动质量
    - 为每位联系人提供具体、可操作的后续步骤
    - 根据紧迫性和潜在价值对后续行动进行优先排序
    - 识别具有明确潜在利益的具体商业机会
    `;

	const openai = new OpenAI({
		apiKey: aiPreset.apiKey,
		baseURL: aiPreset.url,
		dangerouslyAllowBrowser: true,
	});

	console.log("prompt", prompt);


	const response = await openai.chat.completions.create({
		model: aiPreset.model,
		messages: [{ role: "user", content: prompt }],
		// response_format: { type: "json_object" },
		response_format: zodResponseFormat(relationshipIntelligence, "relationshipIntelligence"),
	});

	console.log("relationship intelligence response", response.choices[0].message.content);
	return JSON.parse(response.choices[0].message.content || "{}");
}

async function readRecentLogs(
	client: Client,
	databaseId: string,
	since: Date,
): Promise<string> {
	try {
		const response = await client.databases.query({
			database_id: databaseId,
			filter: {
				and: [
					{
						property: "Date",
						date: {
							on_or_after: since.toISOString().split("T")[0],
						},
					},
				],
			},
			sorts: [
				{
					property: "Date",
					direction: "ascending",
				},
			],
		});

		return response.results
			.map((page: any) => {
				const title = page.properties.Title?.title[0]?.text?.content || "";
				const description =
					page.properties.Description?.rich_text[0]?.text?.content || "";
				return `${title}\n${description}`;
			})
			.join("\n\n");
	} catch (error) {
		console.error("Failed to read logs:", error);
		return "";
	}
}

export async function GET() {
	try {
		const settings = await settingsStore.loadPipeSettings("notion");

		console.log("settings", settings);

		const aiPreset = settingsStore.getPreset("notion", "aiLogPresetId");

		if (
			!settings?.notion?.accessToken ||
			!settings?.notion?.databaseId ||
			!settings?.notion?.intelligenceDbId
		) {
			return NextResponse.json(
				{ error: "notion not configured" },
				{ status: 400 },
			);
		}

		const client = new Client({ auth: settings.notion.accessToken });

		// Get last 24 hours of logs
		const today = new Date();
		const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

		const recentLogs = await readRecentLogs(
			client,
			settings.notion.databaseId,
			yesterday,
		);

		if (!recentLogs) {
			return NextResponse.json(
				{ message: "no logs found for analysis" },
				{ status: 404 },
			);
		}

		const intelligence = await analyzeRelationships(
			recentLogs,
			aiPreset
		);

		const notion = new NotionClient(settings.notion);

		const deepLink = await notion.createIntelligence(intelligence);

		return NextResponse.json({
			message: "relationship intelligence updated",
			intelligence,
			deepLink,
			summary: {
				contacts: intelligence.contacts.length,
				opportunities: intelligence.insights.opportunities.length,
				needsFollowUp: intelligence.insights.followUps.length,
				logsAnalyzed: recentLogs.length,
			},
		});
	} catch (error) {
		console.error("error in intelligence api:", error);
		return NextResponse.json(
			{ error: `failed to process intelligence: ${error}` },
			{ status: 500 },
		);
	}
}
