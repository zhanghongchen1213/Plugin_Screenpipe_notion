import { ContentItem } from "@screenpipe/js";
import { WorkLog } from "./types";
import { embed } from "ai";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { settingsStore } from "./store/settings-store";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";

export const workLog = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
});

async function extractLinkedContent(prompt: string): Promise<string> {
  try {
    // Match @[[file]] or @[[folder/file]] patterns
    const linkRegex = /@\[\[(.*?)\]\]/g;
    const matches = [...prompt.matchAll(linkRegex)];
    const settings = await settingsStore.loadPipeSettings("notion");
    let enrichedPrompt = prompt;

    const notion = new Client({
      auth: settings?.notion?.accessToken,
    });

    const n2m = new NotionToMarkdown({ notionClient: notion });
    for (const match of matches) {
      const pageId = match[1];

      try {
        const mdblocks = await n2m.pageToMarkdown(pageId);
        const mdString = n2m.toMarkdownString(mdblocks);

        enrichedPrompt = enrichedPrompt.replace(
          match[0],
          `\n--- Content of ${pageId} ---\n${mdString.parent}\n---\n`
        );
      } catch (error) {
        console.error(error, `of ${pageId}`);
      }
    }
    return enrichedPrompt;
  } catch (e) {
    console.error("not able to connect to notion", e);
    return prompt;
  }
}

export async function generateWorkLog(
  screenData: ContentItem[],
  aiPreset: ReturnType<typeof settingsStore.getPreset>,
  startTime: Date,
  endTime: Date,
  customPrompt?: string
): Promise<WorkLog> {

  if (!aiPreset) {
    throw new Error("ai preset not found");
  }

  let enrichedPrompt = customPrompt || aiPreset.prompt || "";

  if (customPrompt) {
    enrichedPrompt = await extractLinkedContent(customPrompt);
  }

  const defaultPrompt = `你是一个有用的助手，负责分析屏幕数据并生成准确的工作活动日志条目。

    指令：
    - 仔细检查屏幕数据以识别执行的主要活动
    - 提取特定的应用程序名称、访问的网站和处理的文档
    - 创建已完成工作的精确、事实性描述
    - 根据实际内容（项目、工具、主题）识别相关标签
    - 使用以下上下文来理解用户的目标和优先级：

    ${enrichedPrompt}

    屏幕数据: ${JSON.stringify(screenData)}

    返回一个完全符合此结构的有效 JSON 对象：
    {
        "title": "反映主要活动的具体、准确的标题",
        "description": "详细但简洁的描述已完成的工作，提及具体的工具和内容",
        "tags": ["#相关标签1", "#相关标签2", "#相关标签3"]
    }

    确保 JSON 格式正确，仅包含请求的字段。`;

  console.log("enrichedPrompt prompt:", enrichedPrompt);

  const openai = new OpenAI({
    apiKey: aiPreset.apiKey,
    baseURL: aiPreset.url,
    dangerouslyAllowBrowser: true,
  });

  const response = await openai.chat.completions.create({
    model: aiPreset.model,
    messages: [{ role: "user", content: defaultPrompt }],
    response_format: zodResponseFormat(workLog, "workLog"),
  });

  const formatDate = (date: Date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return {
    ...JSON.parse(response.choices[0].message.content || "{}"),
    startTime: formatDate(startTime),
    endTime: formatDate(endTime),
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}

export async function deduplicateScreenData(
  screenData: ContentItem[],
): Promise<ContentItem[]> {
  if (!screenData.length) return screenData;

  try {
    const provider = ollama.embedding("nomic-embed-text");
    const embeddings: number[][] = [];
    const uniqueData: ContentItem[] = [];
    let duplicatesRemoved = 0;

    for (const item of screenData) {
      const textToEmbed =
        "content" in item
          ? typeof item.content === "string"
            ? item.content
            : "text" in item.content
              ? item.content.text
              : JSON.stringify(item.content)
          : "";

      if (!textToEmbed.trim()) {
        uniqueData.push(item);
        continue;
      }

      try {
        const { embedding } = await embed({
          model: provider,
          value: textToEmbed,
        });

        let isDuplicate = false;
        for (let i = 0; i < embeddings.length; i++) {
          const similarity = cosineSimilarity(embedding, embeddings[i]);
          if (similarity > 0.95) {
            isDuplicate = true;
            duplicatesRemoved++;
            break;
          }
        }

        if (!isDuplicate) {
          embeddings.push(embedding);
          uniqueData.push(item);
        }
      } catch (error) {
        console.warn("embedding failed for item, keeping it:", error);
        uniqueData.push(item);
      }
    }

    console.log(
      `deduplication: removed ${duplicatesRemoved} duplicates from ${screenData.length} items`,
    );
    return uniqueData;
  } catch (error) {
    console.warn("deduplication failed, using original data:", error);
    return screenData;
  }
}
