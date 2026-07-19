import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Segmented } from "@/components/ui/Segmented";
import { Tooltip } from "@/components/ui/Tooltip";
import { ToolManager } from "./ToolManager";
import { DataManager } from "./DataManager";
import { AboutTab } from "./AboutTab";

// 设置中心三个 tab：工具管理 / 数据管理 / 关于
type SettingsTab = "tools" | "data" | "about";

const TAB_OPTIONS: { value: SettingsTab; label: string }[] = [
  { value: "tools", label: "工具管理" },
  { value: "data", label: "数据管理" },
  { value: "about", label: "关于" },
];

const VALID_TABS: SettingsTab[] = ["tools", "data", "about"];

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();

  // 从 URL 读取 ?tab=tools|data|about，默认 tools
  const tabParam = params.get("tab");
  const initialTab: SettingsTab =
    tabParam && VALID_TABS.includes(tabParam as SettingsTab)
      ? (tabParam as SettingsTab)
      : "tools";
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  // 切换 tab 时同步到 URL（默认 tab 不写入 query）
  const onTabChange = (next: SettingsTab) => {
    setTab(next);
    const p = new URLSearchParams(params);
    if (next === "tools") {
      p.delete("tab");
    } else {
      p.set("tab", next);
    }
    setParams(p, { replace: true });
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Tooltip
          content="管理工具显示与排序、数据导入导出及应用信息。"
          placement="bottom"
        >
          <h2 className="text-xl md:text-2xl font-semibold text-primary cursor-help">
            设置中心
          </h2>
        </Tooltip>
      </div>

      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={(v) => onTabChange(v as SettingsTab)}
          options={TAB_OPTIONS}
        />
      </div>

      <div>
        {tab === "tools" && <ToolManager />}
        {tab === "data" && <DataManager />}
        {tab === "about" && <AboutTab />}
      </div>
    </div>
  );
}
