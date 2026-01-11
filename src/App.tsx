import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Drafts from "@/pages/Drafts";
import NewDraft from "@/pages/NewDraft";
import EditDraft from "@/pages/EditDraft";
import PreviewDraft from "@/pages/PreviewDraft";
import Share from "@/pages/Share";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/drafts" element={<Drafts />} />
      <Route path="/drafts/new" element={<NewDraft />} />
      <Route path="/drafts/:id/edit" element={<EditDraft />} />
      <Route path="/drafts/:id/preview" element={<PreviewDraft />} />
      <Route path="/share" element={<Share />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
