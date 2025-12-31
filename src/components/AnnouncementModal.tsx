import React, { useEffect, useState } from "react";
import "./AnnouncementModal.css";

const STORAGE_KEY = "club_announcement_v1";

type Props = {
  onAction?: () => void;
};

const AnnouncementModal = ({ onAction }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleAction = () => {
    if (onAction) onAction();
    handleClose();
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">👋 嗨，早期的探索者！</div>
        <div className="modal-body">
          <p>我们的俱乐部网站刚刚上线，现在就像一个刚出生的宝宝，非常需要你的建议！</p>
          <p>
            如果你发现了 <strong>Bug</strong> 🐛，或者单纯想<strong>加入我们</strong>搞事情...
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>
            先逛逛看
          </button>
          <button className="btn-primary" onClick={handleAction}>
            🐞 去提建议 / 拿盲盒
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
