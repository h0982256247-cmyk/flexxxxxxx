import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();
  return (
    <div className="glass-bg">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="glass-panel p-8">
          <div className="text-2xl font-semibold">Flex Glass Editor</div>
          <div className="mt-2 opacity-70">一般人也能用的 Flex 編輯器（Hero/Body/Footer）</div>
          <div className="mt-6 flex gap-3">
            <button className="glass-btn" onClick={() => nav("/login")}>登入</button>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="glass-panel p-4"><div className="font-semibold">內建範本</div><div className="text-sm opacity-70 mt-1">建立後立即可預覽</div></div>
            <div className="glass-panel p-4"><div className="font-semibold">防呆驗證</div><div className="text-sm opacity-70 mt-1">錯誤不會產生分享</div></div>
            <div className="glass-panel p-4"><div className="font-semibold">固定版本</div><div className="text-sm opacity-70 mt-1">重發=新版本，舊連結停用</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
