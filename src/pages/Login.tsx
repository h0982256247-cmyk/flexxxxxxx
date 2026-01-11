import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const signIn = async () => {
    setMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Login Error Object:", error);
        return setMsg(error.message + " (請檢查主控台 Console)");
      }
      console.log("Login Success Data:", data);
      nav("/drafts");
    } catch (e: any) {
      console.error("Login Exception:", e);
      setMsg(e.message || "發生未知錯誤");
    }
  };



  return (
    <div className="glass-bg">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="glass-panel p-6">
          <div className="text-xl font-semibold">登入</div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="glass-label mb-2">Email</div>
              <input className="glass-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <div className="glass-label mb-2">Password</div>
              <input className="glass-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {msg ? <div className="text-sm text-red-600">{msg}</div> : null}
            <div>
              <button className="glass-btn w-full" onClick={signIn}>登入</button>
            </div>
            <button className="glass-btn glass-btn--secondary w-full" onClick={() => nav("/")}>回首頁</button>
          </div>
        </div>
      </div>
    </div>
  );
}
