import type { Settings as ScreenpipeAppSettings } from "@screenpipe/js";
import {
  getScreenpipeAppSettings,
  updateScreenpipeAppSettings,
} from "@/lib/actions/get-screenpipe-app-settings";
import { Settings as PipeSettingsFromTypes } from "@/lib/types";

export interface PipeSettings extends PipeSettingsFromTypes {
	shortTasksInterval: number;
	exampleSetting: string;
	aiLogPresetId: string;
	aiPresetId: string;
  deduplicationEnabled: boolean;
}

type AIPreset = ScreenpipeAppSettings["aiPresets"][number];

const DEFAULT_SETTINGS: Partial<PipeSettings> = {
  prompt: `你是一位专业的个人数据分析师。请分析屏幕活动数据（包含 OCR 文字和音频），以提取用于生成专业工作日志的关键信息。

调查规则：
- 提取我互动的人员姓名及讨论内容，当遇到人名时，确保使用 [[姓名]] 格式提取，以便链接到我的笔记中。
- 识别对话中的重复主题/议题，使用标签或 [[链接]] 到我的笔记。
- 发现我或他人做出的承诺或约定。
- 捕捉闲聊中提到的有趣想法或见解。
- 记录对话的情感氛围和能量水平。
- 突出潜在的机会或联系。
- 追踪提到的项目进度和阻碍。

风格规则：
- 始终将人名放在双括号中，例如：[[张三]] 以链接到他们的笔记，公司也是如此，例如：[[谷歌]]，或项目，例如：[[项目 X]]。
- 保持真实和对话式，但要专业。
- 清晰明了，使用要点。
- 包含相关的时间戳。
- 将相关信息归类。
- 每个见解不超过 4 行。
- 拒绝官僚语言，保持人性化。
- 标签使用连字符分隔单词，无空格，例如：#my-tag 不是 #my tag 也不是 #myTag 或 #my_tag。

记住：你正在分析来自我计算机的屏幕 OCR 文字和音频等，所以请专注于实际的互动和内容！
你将获得大约 5 分钟的数据块（屏幕和音频录音），并必须编写日志。
这些数据稍后将用于分析，必须包含关于我正在做什么的有价值的见解。
如果你工作出色，我会给你一个 🍺 和 100 万美元奖励。`,
};

type Listener = () => void;

type Store = {
  globalSettings: Partial<ScreenpipeAppSettings> | null;
  pipeSettings: Record<string, Partial<PipeSettings> | null>;
};

export class SettingsStore {
  private store: Store = {
    globalSettings: null,
    pipeSettings: {},
  };
  private listeners: Set<Listener> = new Set();

  // get the store
  getStore() {
    return this.store;
  }

  // subscribe to changes in the store
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // notify the listeners that the store has changed
  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // set the global settings
  async setGlobalSettings(settings: Partial<ScreenpipeAppSettings> | null) {
    this.store.globalSettings = settings;
    this.notify();
  }

  // set the pipe settings
  async setPipeSettings(
    pipeName: string,
    settings: Partial<PipeSettings> | null,
  ) {
    this.store.pipeSettings[pipeName] = settings;
    this.notify();
  }

  // load the global settings
  async loadGlobalSettings() {
    try {
      const screenpipeSettings = await getScreenpipeAppSettings();
      this.setGlobalSettings(screenpipeSettings);
      return screenpipeSettings;
    } catch (error) {
      console.error("failed to load global settings:", error);
      return null;
    }
  }

  // update the global settings
  async updateGlobalSettings(newSettings: Partial<ScreenpipeAppSettings>) {
    try {
      const mightBeUpdated = await getScreenpipeAppSettings();

      const updatedSettings = {
        ...mightBeUpdated,
        ...newSettings,
      };

      await updateScreenpipeAppSettings(updatedSettings);
      this.setGlobalSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error("failed to update global settings:", error);
      return false;
    }
  }

  // load the pipe settings
  async loadPipeSettings(pipeName: string): Promise<PipeSettings | null> {
    try {
      const screenpipeSettings = await getScreenpipeAppSettings();

      // if global settings are not loaded, load them
      if (!this.store.globalSettings) {
        await this.loadGlobalSettings();
      }

      const settings = {
        ...DEFAULT_SETTINGS,
        ...screenpipeSettings.customSettings?.[pipeName],
      };
      this.setPipeSettings(pipeName, settings);
      return settings;
    } catch (error) {
      console.error("failed to load pipe settings:", error);
      return null;
    }
  }

  // update the pipe settings
  async updatePipeSettings(
    pipeName: string,
    newSettings: Partial<PipeSettings>,
  ) {
    try {
      // get the current settings
      const mightBeUpdated = await getScreenpipeAppSettings();

      const updatedSettings = {
        ...mightBeUpdated,
        customSettings: {
          ...(mightBeUpdated.customSettings || {}),
          [pipeName]: {
            ...(mightBeUpdated.customSettings?.[pipeName] || {}),
            ...newSettings,
          },
        },
      };

      await updateScreenpipeAppSettings(updatedSettings);
      this.setGlobalSettings(updatedSettings);
      this.setPipeSettings(pipeName, {
        ...(mightBeUpdated.customSettings?.[pipeName] || {}),
        ...newSettings,
      });
      return true;
    } catch (error) {
      console.error("failed to update pipe settings:", error);
      return false;
    }
  }

  // get the preset
  getPreset(
    pipeName: string,
    key: keyof PipeSettings = "aiPresetId",
  ): (AIPreset & { apiKey: string }) | undefined {
    try {
      const presetId = this.store.pipeSettings[pipeName]?.[key];
      const screenpipeSettings = this.store.globalSettings;

      let preset: AIPreset | undefined;

      if (presetId) {
        preset = screenpipeSettings?.aiPresets?.find(
          (preset) => preset.id === presetId,
        );
      }

      if (!preset) {
        preset = screenpipeSettings?.aiPresets?.find(
          (preset) => preset.defaultPreset,
        );
      }

      if (!preset) {
        return undefined;
      }

      // Handle different provider types that may have apiKey
      const apiKey =
        "provider" in preset && preset.provider === "screenpipe-cloud"
          ? screenpipeSettings?.user?.token || ""
          : "provider" in preset && "apiKey" in preset
            ? (preset.apiKey as string) || ""
            : "";

      return {
        id: preset.id,
        maxContextChars: preset.maxContextChars,
        url: preset.url,
        model: preset.model,
        defaultPreset: preset.defaultPreset,
        prompt: preset.prompt,
        provider: preset.provider,
        apiKey,
      };
    } catch (error) {
      console.error("failed to get preset:", error);
      return undefined;
    }
  }
}

export const settingsStore = new SettingsStore(); 