import code4teamQR from "./assets/code4team.jpg";
import groupQrImg from "./assets/team_code.jpg";
import adminQrImg from "./assets/person_code.jpg";
import { useState, useEffect, useMemo, useRef, useCallback, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, EnvironmentType } from "laf-client-sdk";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import { MapPin, Zap, User, Calendar, Search, Palette, Home, LayoutGrid, Eraser, Shield, ShieldAlert, ShieldCheck, Mail, Edit3, Save, Trophy, Star, Crown, Gift, Sparkles, QrCode, BadgeCheck, Megaphone, UserMinus, Users, Eye, Share2, Download, X, Copy, HeartHandshake, Code2, Coffee, ChevronRight, Image as ImageIcon } from "lucide-react";
import AnnouncementModal from "./components/AnnouncementModal";

// ⚠️ 前端白名单 (控制 Tab 显示)，需要与后端保持一致
const ADMIN_USERS = ["ding", "chen"];

// --- 配置区域 ---
const cloud = new Cloud({
  baseUrl: "https://yqq4612qr7.bja.sealos.run", 
  getAccessToken: () => localStorage.getItem("access_token") || "",
  environment: EnvironmentType.H5,
});

// --- 数据类型 ---
interface UserProfile {
  gender?: "男" | "女" | "保密";
  grade?: string;
  city?: string;
  hobbies?: string;
  intro?: string;
  mbti?: string;
  wechat_id?: string;
}

interface UserData {
  _id: string;
  username: string;
  is_verified?: boolean;
  edu_email?: string;
  profile?: UserProfile;
  stats?: { completed_count?: number };
}

interface ChatMsg {
  _id?: string;
  activityId: string;
  sender: string;
  text: string;
  created_at: number;
  msgType?: string;
  payload?: unknown;
}

interface NotifyItem {
  _id?: string;
  id?: string;
  from_user?: string;
  text?: string;
  created_at?: number;
  activity_id?: string;
  msg_id?: string;
}

type SharedActivityPayload = {
  id: string;
  title: string;
  time: string;
  location: string;
};

function isSharedActivityPayload(payload: unknown): payload is SharedActivityPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    typeof p.time === "string" &&
    typeof p.location === "string"
  );
}

type CategoryType = "吃喝玩乐" | "运动流汗" | "硬核自习" | "探索随机";

interface Activity {
  _id: string;
  title: string;
  description: string;
  max_people: number;
  min_people?: number;
  time: string;
  location: string;
  author: string;
  category: string;
  soul_question?: string;
  created_at?: number;
  joined_users: string[];
  hidden_by?: string[]; 
  status?: 'active' | 'locked' | 'cancelled' | 'done';
  requires_verification?: boolean;
  requirements?: {
    gender: "any" | "female_only" | "male_only";
    identity: "any" | "undergrad" | "graduate" | "PhD";
    stranger: "ok" | "new_friends" | "has_circle";
    vibe: string[];
    host_flags: string[];
  };
  tags?: string[];
  topic?: string;
  view_count?: number;
  msg_count?: number;
}

interface ActivityDraft {
  title: string;
  description: string;
  category: CategoryType;
  location: string;
  min_people: string;
  max_people: string;
  requires_verification: boolean;
  soul_question?: string;
}

// --- 皮肤配置 ---
const THEMES = {
  fairy: {
    id: "fairy",
    name: "神仙青",
    bg: "bg-[#F2E3C6]",
    primary: "bg-[#0095D9]",
    primaryText: "text-[#0095D9]",
    badge: "bg-[#FF4C00] text-white",
    navActive: "text-[#FF4C00]",
    border: "border-[#0095D9]",
    cardBg: "bg-white/70 backdrop-blur-md",
    textMain: "text-slate-800",
    card: "bg-white/80",
    accent: "bg-[#0095D9]",
    icon: "text-[#0095D9]",
    navInactive: "text-slate-400",
    glowPrimary: "rgba(0,149,217,0.18)",
    glowSecondary: "rgba(255,76,0,0.14)",
    primaryBorder: "border-[#0095D9]",
  },
  forest: {
    id: "forest",
    name: "绿沈幽",
    bg: "bg-[#FCF5E2]",
    primary: "bg-[#0C8918]",
    primaryText: "text-[#0C8918]",
    badge: "bg-[#FCC96E] text-[#0C8918]",
    navActive: "text-[#0C8918]",
    border: "border-[#0C8918]",
    cardBg: "bg-white/70 backdrop-blur-md",
    textMain: "text-slate-800",
    card: "bg-white/80",
    accent: "bg-[#0C8918]",
    icon: "text-[#0C8918]",
    navInactive: "text-slate-400",
    glowPrimary: "rgba(12,137,24,0.16)",
    glowSecondary: "rgba(252,201,110,0.18)",
    primaryBorder: "border-[#0C8918]",
  },
  british: {
    id: "british",
    name: "英伦红",
    bg: "bg-[#0f0b0a]",
    primary: "bg-[#4A010A]",
    primaryText: "text-[#C18F4E]",
    badge: "bg-[#C18F4E] text-[#4A010A]",
    navActive: "text-[#C18F4E]",
    border: "border-[#C18F4E]",
    cardBg: "bg-[#312520]/80 backdrop-blur-md",
    textMain: "text-[#F2E3C6]",
    card: "bg-[#312520]/80",
    accent: "bg-[#C18F4E]",
    icon: "text-[#C18F4E]",
    navInactive: "text-[#9E8B73]",
    glowPrimary: "rgba(193,143,78,0.18)",
    glowSecondary: "rgba(74,1,10,0.20)",
    primaryBorder: "border-[#C18F4E]",
  },
};

type ThemeKey = keyof typeof THEMES;
type ThemePalette = (typeof THEMES)[ThemeKey];
const CATEGORY_OPTIONS: CategoryType[] = ["吃喝玩乐", "运动流汗", "硬核自习", "探索随机"];
const CATEGORY_LABELS: Record<CategoryType, string> = {
  吃喝玩乐: "🍔 吃喝玩乐",
  运动流汗: "🏃‍♂️ 运动流汗",
  硬核自习: "📚 硬核自习",
  探索随机: "🌍 探索随机",
};
const CATEGORY_BADGE_STYLES: Record<CategoryType, string> = {
  吃喝玩乐: "bg-orange-100 text-orange-700",
  运动流汗: "bg-emerald-100 text-emerald-700",
  硬核自习: "bg-indigo-100 text-indigo-700",
  探索随机: "bg-fuchsia-100 text-fuchsia-700",
};
const LEGACY_TO_META_CATEGORY: Record<string, CategoryType> = {
  吃喝玩乐: "吃喝玩乐",
  运动流汗: "运动流汗",
  硬核自习: "硬核自习",
  探索随机: "探索随机",
  约饭: "吃喝玩乐",
  美食搭子: "吃喝玩乐",
  桌游搭子: "吃喝玩乐",
  逛街散步: "吃喝玩乐",
  运动健身: "运动流汗",
  学习搭子: "硬核自习",
  硬核竞赛: "硬核自习",
  文艺演出: "探索随机",
  艺术展览: "探索随机",
  旅行搭子: "探索随机",
  游戏搭子: "探索随机",
};

function normalizeCategory(category: string | undefined): CategoryType {
  if (!category) return "探索随机";
  return LEGACY_TO_META_CATEGORY[category] || "探索随机";
}

// ===== Admin 组件 =====
const AdminView = ({
  currentUser,
  cloud,
  onClose,
}: {
  currentUser: string;
  cloud: Cloud;
  onClose: () => void;
}) => {
  const [viewState, setViewState] = useState<"list" | "detail">("list");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [targetUser, setTargetUser] = useState(""); // 用于手动输入的用户名

  // 加载列表
  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await cloud.invoke("admin-ops", {
        type: "admin-list-activities",
        username: currentUser,
      });
      if (res.ok) setActivities(res.data);
      else alert(res.msg);
    } catch {
      alert("加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [cloud, currentUser]);

  // 加载单个详情
  const loadDetail = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await cloud.invoke("admin-ops", {
        type: "admin-get-activity",
        username: currentUser,
        activityId: id,
      });
      if (res.ok) {
        setCurrentActivity(res.data);
        setViewState("detail");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 添加成员
  const handleAddMember = async () => {
    if (!currentActivity || !targetUser) return;
    try {
      const res = await cloud.invoke("admin-ops", {
        type: "admin-add-member",
        username: currentUser,
        activityId: currentActivity._id,
        targetUsername: targetUser,
      });
      if (res.ok) {
        alert("添加成功");
        setTargetUser("");
        loadDetail(currentActivity._id); // 刷新
      } else {
        alert(res.msg);
      }
    } catch {
      alert("操作失败");
    }
  };

  // 踢出成员
  const handleKickMember = async (target: string) => {
    if (!window.confirm(`确定要把 ${target} 踢出活动吗？`)) return;
    if (!currentActivity) return;
    try {
      const res = await cloud.invoke("admin-ops", {
        type: "admin-kick-member",
        username: currentUser,
        activityId: currentActivity._id,
        targetUsername: target,
      });
      if (res.ok) {
        loadDetail(currentActivity._id); // 刷新
      } else {
        alert(res.msg);
      }
    } catch {
      alert("操作失败");
    }
  };

  useEffect(() => {
    loadList();
  }, [loadList]);

  return (
    <div className="pt-2 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <ShieldAlert className="text-red-600" /> 管理控制台
        </h2>
        <div className="flex items-center gap-2">
          {viewState === "detail" && (
            <button
              onClick={() => setViewState("list")}
              className="px-4 py-2 bg-gray-200 rounded-xl font-bold text-xs"
            >
              返回列表
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black text-white rounded-xl font-bold text-xs"
          >
            关闭
          </button>
        </div>
      </div>

      {isLoading && <div className="text-center py-4 text-gray-400 font-bold">加载中...</div>}

      {/* 列表视图 */}
      {viewState === "list" && (
        <div className="space-y-4">
          {activities.map((act) => (
            <div
              key={act._id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{act.title}</div>
                  <div className="text-xs text-gray-400 font-bold">ID: {act._id}</div>
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-black ${
                    act.status === "active"
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {act.status || "active"}
                </div>
              </div>

              <div className="flex justify-between items-end mt-2">
                <div className="text-xs text-gray-500 font-bold space-y-1">
                  <div>房主: {act.author}</div>
                  <div>时间: {act.time}</div>
                  <div>热度: {act.view_count || 0} 次浏览</div>
                  <div>人数: {(act.joined_users || []).length} / {act.max_people}</div>
                </div>
                <button
                  onClick={() => loadDetail(act._id)}
                  className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold active:scale-95"
                >
                  管理成员
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 详情视图 */}
      {viewState === "detail" && currentActivity && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-200">
            <h3 className="font-black text-lg mb-2">{currentActivity.title}</h3>
            <div className="text-xs text-gray-400 font-bold">ID: {currentActivity._id}</div>
          </div>

          {/* 添加成员区域 */}
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <h4 className="font-bold text-sm text-blue-800 mb-3 flex items-center gap-2">
              <Users size={16} /> 手动添加成员
            </h4>
            <div className="flex gap-2">
              <input
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                placeholder="输入用户名"
                className="flex-1 p-3 rounded-xl border-none outline-none font-bold text-sm"
              />
              <button
                onClick={handleAddMember}
                className="px-4 bg-blue-600 text-white rounded-xl font-bold text-sm"
              >
                加入
              </button>
            </div>
          </div>

          {/* 成员列表 */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-gray-500 pl-1">
              成员列表 ({currentActivity.joined_users?.length})
            </h4>
            {currentActivity.joined_users?.map((u, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xs text-gray-500">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{u}</div>
                    {u === currentActivity.author && (
                      <div className="text-[10px] text-orange-500 font-black">房主</div>
                    )}
                  </div>
                </div>

                {u !== currentActivity.author && (
                  <button
                    onClick={() => handleKickMember(u)}
                    className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-95"
                  >
                    <UserMinus size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 海报生成组件
const PosterModal = ({ activity, onClose }: { activity: Activity; onClose: () => void }) => {
  const posterRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    try {
      const canvas = await html2canvas(posterRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `ClubDAO邀请函-${activity.title}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch {
      alert("生成失败，请截图保存");
    }
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}?aid=${activity._id}`;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div ref={posterRef} className="w-[300px] bg-[#FFFBF0] rounded-[2rem] overflow-hidden shadow-2xl relative">
          <div className="h-40 bg-gradient-to-br from-red-600 to-red-800 flex flex-col items-center justify-center text-orange-100 p-6 text-center relative overflow-hidden">
            <div className="text-4xl mb-2">🏮</div>
            <div className="text-xl font-black tracking-wider">新春搭子局</div>
            <div className="absolute -bottom-6 -right-6 text-9xl opacity-10 rotate-12">福</div>
          </div>

          <div className="p-6 text-center space-y-4">
            <h2 className="text-xl font-black text-gray-900 leading-tight">{activity.title}</h2>

            <div className="text-xs text-gray-500 font-bold space-y-1 bg-orange-50 p-3 rounded-xl border border-orange-100">
              <p>📅 {activity.time}</p>
              <p>📍 {activity.location}</p>
              <p>🔥 缺 {activity.max_people - (activity.joined_users?.length || 0)} 人</p>
            </div>

            <div className="flex justify-center my-2">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                <QRCodeCanvas value={shareUrl} size={110} fgColor="#991B1B" />
              </div>
            </div>

            <div className="text-[10px] text-gray-400 font-bold">长按扫码加入 · ClubDAO</div>
          </div>
        </div>

        <div className="flex gap-4 mt-6 justify-center">
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-95 transition-transform">
            <X />
          </button>
          <button
            onClick={handleDownload}
            className="h-12 px-6 rounded-full bg-white text-red-600 font-black flex items-center gap-2 shadow-xl active:scale-95 transition-transform"
          >
            <Download size={18} /> 保存图片
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<"square" | "my_activities" | "profile" | "admin">("square");
  const [activitySubTab, setActivitySubTab] = useState<"ongoing" | "history">("ongoing");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [posterTarget, setPosterTarget] = useState<Activity | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [squareCategory, setSquareCategory] = useState<"全部" | CategoryType>("全部");
  const [tagFilter, setTagFilter] = useState<string>("");
  const categoryFilter = squareCategory;
  const setCategoryFilter = setSquareCategory;
  const [inputTimeStr, setInputTimeStr] = useState("");
  const [soulQuestion, setSoulQuestion] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [genderLimit, setGenderLimit] = useState("不限");
  const [identityLimit, setIdentityLimit] = useState("不限");
  const [activeCategory, setActiveCategory] = useState<CategoryType>(CATEGORY_OPTIONS[0]);
  const [activeScene, setActiveScene] = useState("仙林");
  const [activeTime, setActiveTime] = useState("今天");
  const [isVerifiedOnly, setIsVerifiedOnly] = useState(false);
  const categories = CATEGORY_OPTIONS;
  const timeChips = ["今天", "明晚", "本周末", "随时"];
  const scenes = [
    { id: "仙林", svg: <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M20 60 L50 30 L80 60" /><path d="M30 50 L30 90 L70 90 L70 50" /><circle cx="50" cy="55" r="5" /></svg> },
    { id: "鼓楼", svg: <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M40 30 L50 10 L60 30" /><path d="M40 30 L40 90 L60 90 L60 30" /><rect x="45" y="45" width="10" height="15" /></svg> },
    { id: "苏州", svg: <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M20 50 Q 50 30 80 50" /><path d="M35 45 L35 80 L65 80 L65 45" /><path d="M20 85 Q 35 75 50 85 T 80 85" /></svg> },
    { id: "浦口", svg: <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="50" cy="40" r="15" /><path d="M50 55 L50 90" /><path d="M30 90 L70 90" /><path d="M50 65 L35 85" /><path d="M50 65 L65 85" /></svg> },
  ] as const;
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<Activity | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomActivity, setRoomActivity] = useState<Activity | null>(null);
  const [activityDraft, setActivityDraft] = useState<ActivityDraft>({
    title: "",
    description: "",
    category: CATEGORY_OPTIONS[0],
    location: "",
    min_people: "",
    max_people: "",
    requires_verification: false,
    soul_question: "",
  });

const [reqDraft, setReqDraft] = useState({
  gender: "any" as "any" | "female_only" | "male_only",
  identity: "any" as "any" | "undergrad" | "graduate" | "PhD",
  stranger: "ok" as "ok" | "new_friends" | "has_circle",
  vibe: [] as string[],
  host_flags: [] as string[],
});

const [needPwdChange, setNeedPwdChange] = useState(false);
const [tagInput, setTagInput] = useState("");
const [tags, setTags] = useState<string[]>([]);

  const [currentUser, setCurrentUser] = useState<string>("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const isAdminUser = ADMIN_USERS.includes(currentUser);

  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfile>({});

  const [dateState, setDateState] = useState(() => {
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1); 
    return { year: tmr.getFullYear(), month: tmr.getMonth() + 1, day: tmr.getDate(), hour: 0, minute: 0 };
  });
  const [notifications, setNotifications] = useState<NotifyItem[]>([]);
  const [readCursors, setReadCursors] = useState<Record<string, number>>({});
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [targetMsgId, setTargetMsgId] = useState<string>("");

  useEffect(() => {
    const { year, month, day, hour, minute } = dateState;
    const f = (n: number) => n.toString().padStart(2, '0'); 
    setInputTimeStr(`${year}/${f(month)}/${f(day)} ${f(hour)}:${f(minute)}`);
  }, [dateState]);

  useEffect(() => {
    if (!currentUser) return;
    const saved = localStorage.getItem(`club_secret_badge_${currentUser}`) || "";
    setSecretBadge(saved);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const sync = async () => {
      try {
        const res = await cloud.invoke("user-ops", { type: "sync-state", username: currentUser });
        if (res?.ok) {
          setNotifications(res.notifications || []);
          setReadCursors(res.read_cursors || {});

          // 如果后端返回了最新的 msg_counts，更新活动列表以触发红点
          if (res.msg_counts) {
            setActivities(prev => prev.map(act => {
              const newCount = res.msg_counts[act._id];
              if (newCount !== undefined && newCount !== act.msg_count) {
                return { ...act, msg_count: newCount };
              }
              return act;
            }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    sync();
    const timer = setInterval(sync, 4000);
    return () => clearInterval(timer);
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === "admin" && !isAdminUser) {
      setActiveTab("square");
    }
  }, [activeTab, isAdminUser]);

  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("fairy");
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(true);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStep, setLoginStep] = useState<"inputName" | "nameTaken" | "inputPassword" | "createAccount">("inputName");
  const [loginError, setLoginError] = useState("");

  // --- 新增组件：联系与共建弹窗 ---
  const ContactModal = () => (
    <div
      className="fixed inset-0 z-[1002] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setShowContactModal(false)}
    >
      <div
        className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部背景 */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-1">👋 嘿，朋友！</h3>
            <p className="text-indigo-100 text-xs font-bold opacity-90">在这里，你的每一个建议都会被认真对待。</p>
          </div>
          <HeartHandshake className="absolute right-[-10px] bottom-[-20px] text-white opacity-10 w-32 h-32 rotate-12" />
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 1. 社群板块 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-900 font-black">
              <Users size={18} />
              <span>加入交流群 / 社团咨询</span>
            </div>
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 text-center">
              <div className="text-xs text-indigo-600 font-bold mb-3">
                不管是提Bug、聊产品、还是单纯想认识新朋友<br />
                <span className="bg-indigo-100 px-1 rounded">没有门槛，来了就是自己人 🍻</span>
              </div>

              <div className="w-40 h-40 bg-white mx-auto rounded-xl p-2 shadow-sm border border-indigo-50 mb-3 flex items-center justify-center">
                <img src={groupQrImg} alt="群二维码" className="w-full h-full object-cover rounded-lg" />
              </div>

              <div className="text-[10px] text-gray-400 font-bold">长按图片保存或扫码加入</div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* 2. 个人/开发板块 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-900 font-black">
              <Code2 size={18} />
              <span>联系开发者 / 一起搞事情</span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-4">
              <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-gray-200 shrink-0 overflow-hidden">
                <img src={adminQrImg} alt="个人微信" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-bold mb-2 leading-relaxed">
                  我是开发者，如果你对代码感兴趣，或者想加入我们社团一起开发 ClubDAO，欢迎骚扰！
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("2313526216");
                    alert("微信号已复制，去微信添加吧~");
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-700 flex items-center gap-1 active:scale-95 shadow-sm"
                >
                  <Copy size={12} /> 点击复制微信号
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowContactModal(false)}
          className="w-full py-4 bg-gray-50 text-gray-400 font-black text-sm hover:bg-gray-100 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );

  // --- 隐藏成就：社群会员盲盒 ---
  const [showSecret, setShowSecret] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [secretBadge, setSecretBadge] = useState<string>(() => {
    if (!currentUser) return "";
    return localStorage.getItem(`club_secret_badge_${currentUser}`) || "";
  });
  const isFounder = secretBadge.includes("Founder");

  const theme = THEMES[currentTheme];
  const navUiSkin = {
    fairy: {
      notifyBadge: "bg-[#FF4C00] text-white",
      adminActive: "text-[#FF4C00]",
      adminInactive: "text-slate-300",
    },
    forest: {
      notifyBadge: "bg-[#FCC96E] text-[#0C8918]",
      adminActive: "text-[#0C8918]",
      adminInactive: "text-slate-300",
    },
    british: {
      notifyBadge: "bg-[#C18F4E] text-[#4A010A]",
      adminActive: "text-[#C18F4E]",
      adminInactive: "text-[#9E8B73]",
    },
  }[theme.id as ThemeKey];

  const fabSkin = {
    fairy: {
      shellShadow: "shadow-[0_8px_30px_rgba(0,149,217,0.25)] hover:shadow-[0_8px_40px_rgba(255,76,0,0.3)]",
      ring: "bg-[conic-gradient(from_0deg,transparent_0%,rgba(0,149,217,0.2)_20%,#0095D9_40%,#FF4C00_60%,transparent_80%)]",
      inner: "bg-white group-hover:bg-slate-50",
      label: "text-slate-800",
      plus: "text-[#0095D9]",
    },
    forest: {
      shellShadow: "shadow-[0_8px_30px_rgba(12,137,24,0.22)] hover:shadow-[0_8px_40px_rgba(252,201,110,0.35)]",
      ring: "bg-[conic-gradient(from_0deg,transparent_0%,rgba(12,137,24,0.18)_20%,#0C8918_40%,#FCC96E_60%,transparent_80%)]",
      inner: "bg-white group-hover:bg-[#F8FAF6]",
      label: "text-[#1F3A24]",
      plus: "text-[#0C8918]",
    },
    british: {
      shellShadow: "shadow-[0_10px_34px_rgba(0,0,0,0.45)] hover:shadow-[0_10px_40px_rgba(193,143,78,0.28)]",
      ring: "bg-[conic-gradient(from_0deg,transparent_0%,rgba(193,143,78,0.18)_20%,#C18F4E_40%,#4A010A_60%,transparent_80%)]",
      inner: "bg-[#312520] group-hover:bg-[#3A2B26]",
      label: "text-[#F2E3C6]",
      plus: "text-[#C18F4E]",
    },
  }[theme.id as ThemeKey];
  const squareEntrySkin = {
    fairy: {
      card: "bg-gradient-to-r from-[#0095D9] via-[#2DB8F3] to-[#FF4C00]",
      chip: "bg-white/20 text-white",
      sub: "text-white/85",
      icon: "bg-white/20",
    },
    forest: {
      card: "bg-gradient-to-r from-[#0C8918] via-[#3BAE49] to-[#FCC96E]",
      chip: "bg-white/25 text-[#143A1A]",
      sub: "text-[#173B1D]/85",
      icon: "bg-white/25",
    },
    british: {
      card: "bg-gradient-to-r from-[#4A010A] via-[#6B121A] to-[#C18F4E]",
      chip: "bg-[#F2E3C6]/20 text-[#F2E3C6]",
      sub: "text-[#F2E3C6]/85",
      icon: "bg-[#F2E3C6]/18",
    },
  }[theme.id as ThemeKey];

  const getUnreadCount = (act: Activity) => {
    if (act._id === "global-square") return 0;
    const total = act.msg_count || 0;
    const read = readCursors[act._id] || 0;
    return Math.max(0, total - read);
  };

  useEffect(() => {
    const savedName = localStorage.getItem("club_username");
    if (savedName) {
      setCurrentUser(savedName);
      setShowLoginModal(false);
      fetchUserData(savedName);
    }
    const savedTheme = localStorage.getItem("club_theme") as ThemeKey;
    if (savedTheme && THEMES[savedTheme]) setCurrentTheme(savedTheme);
    fetchActivities();

    const savedNeed = localStorage.getItem("club_need_pwd_change") === "1";
    setNeedPwdChange(savedNeed);
  }, []);

  // 监听 URL 参数（扫码进入）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const aid = params.get("aid");
    if (aid && activities.length > 0) {
      const target = activities.find((a) => a._id === aid);
      if (target) {
        setPendingJoin(target);
        setShowJoinConfirm(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [activities]);

  const fetchActivities = async () => {
    try { const res = await cloud.invoke("get-activities"); if (res) setActivities(res); } catch (err) { console.error(err); }
  };

  const fetchUserData = async (username: string) => {
    try {
      const res = await cloud.invoke("user-ops", { type: 'get-info', username });
      if (res) {
        setUserData(res);
        setTempProfile(res.profile || {});
      }
    } catch (e) { console.error(e); }
  };

  // --- 统计数据 ---
  const userActivityCount = userData?.stats?.completed_count || 0;

  // --- 拆分列表 ---
  const myOngoingList = useMemo(() => {
    return activities.filter(a => {
      const related = a.author === currentUser || (a.joined_users || []).includes(currentUser);
      if (!related) return false;
      const hidden = (a.hidden_by || []).includes(currentUser);
      if (hidden) return false;
      const st = a.status || 'active';
      if (st === 'cancelled' && a.author === currentUser) return false;
      return st === 'active' || st === 'locked' || st === 'cancelled';
    });
  }, [activities, currentUser]);

  const myHistoryList = useMemo(() => {
    return activities.filter(a => {
      const related = a.author === currentUser || (a.joined_users || []).includes(currentUser);
      if (!related) return false;
      const hidden = (a.hidden_by || []).includes(currentUser);
      if (hidden) return false;
      return (a.status || 'active') === 'done';
    });
  }, [activities, currentUser]);

  const isExpired = (activity: Activity) => {
    if (!activity.time) return false;
    const now = Date.now();
    const created = activity.created_at || now;
    return (now - created) > (5 * 24 * 60 * 60 * 1000); 
  };

  const squareList = useMemo(() => {
    return activities.filter(a => {
      const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = squareCategory === "全部" || normalizeCategory(a.category) === squareCategory;
      const matchTag = !tagFilter || (a.tags || []).includes(tagFilter);

      const isActive = (a.status || 'active') === 'active';
      const isHidden = (a.hidden_by || []).includes(currentUser);
      const expired = isExpired(a);

      return matchSearch && matchCategory && matchTag && isActive && !expired && !isHidden;
    });
  }, [activities, searchTerm, squareCategory, currentUser, tagFilter]);

  const handleSetTheme = (theme: ThemeKey) => {
    setCurrentTheme(theme); localStorage.setItem("club_theme", theme); setShowThemeModal(false);
  };

  const requireStrongPwd = () => {
    if (!needPwdChange) return true;
    alert("🔒 你的密码过短（<5位），为安全起见请先升级密码后再继续使用此功能。");
    setActiveTab("profile");
    return false;
  };

  const MAX_TAGS = 6;
  const MAX_TAG_LEN = 10;
  const MAX_TAG_TOTAL = 50;

  function addTag(raw: string) {
    const t = (raw ?? "").trim().replace(/^#/, "");
    if (!t) return;
    if (t.length > MAX_TAG_LEN) { alert("单个标签最多10字"); return; }
    if (tags.includes(t)) return;
    if (tags.length >= MAX_TAGS) { alert("最多6个标签"); return; }

    const total = tags.reduce((s, x) => s + x.length, 0);
    if (total + t.length > MAX_TAG_TOTAL) { alert("标签总长度最多50字"); return; }

    setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter(x => x !== t));
  }

  const normalizePeople = () => {
    let minVal = parseInt(activityDraft.min_people || "", 10);
    if (Number.isNaN(minVal)) minVal = 2;
    if (minVal < 2) minVal = 2;

    let maxVal = parseInt(activityDraft.max_people || "", 10);
    if (Number.isNaN(maxVal)) maxVal = 5;
    if (maxVal < minVal) maxVal = minVal;

    return { minVal, maxVal };
  };

  const resetCreateDraft = () => {
    const now = new Date();
    setActivityDraft({
      title: "",
      description: "",
      category: CATEGORY_OPTIONS[0],
      location: "",
      min_people: "",
      max_people: "",
      requires_verification: false,
      soul_question: "",
    });
    setReqDraft({
      gender: "any",
      identity: "any",
      stranger: "ok",
      vibe: [],
      host_flags: [],
    });
    setSoulQuestion("");
    setShowAdvanced(false);
    setGenderLimit("不限");
    setIdentityLimit("不限");
    setActiveCategory(CATEGORY_OPTIONS[0]);
    setActiveScene("仙林");
    setActiveTime("今天");
    setIsVerifiedOnly(false);
    setTags([]);
    setTagInput("");
    setDateState({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    });
  };

  const SECRET_DEADLINE_STR = "2025-01-05T23:59:59";
  const secretDeadline = new Date(SECRET_DEADLINE_STR);
  const secretDeadlineLabel = `${(secretDeadline.getMonth() + 1).toString().padStart(2, "0")}/${secretDeadline.getDate().toString().padStart(2, "0")} 截止`;
  const secretDeadlineChip = `${secretDeadline.getMonth() + 1} 月 ${secretDeadline.getDate()} 日截止`;

  const SECRET_BADGES = [
    "🟦 链上萌新",
    "🟪 模型驯兽师",
    "🟨 金科欧皇",
    "🟩 合约守护者",
    "🟥 红队破局者",
    "🟫 数据炼金术士",
    "⬛ 黑金会员·Founder",
  ];

  const drawSecretBadge = async () => {
    if (!currentUser) return;
    if (secretBadge) {
      alert("你已经抽过徽章了（每人一次）");
      return;
    }

    setIsDrawing(true);
    await new Promise((r) => setTimeout(r, 800));

    const pool: string[] = [];
    for (let i = 0; i < SECRET_BADGES.length; i++) {
      const b = SECRET_BADGES[i];
      const weight = i === SECRET_BADGES.length - 1 ? 1 : i >= 4 ? 3 : 8;
      for (let k = 0; k < weight; k++) pool.push(b);
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    localStorage.setItem(`club_secret_badge_${currentUser}`, picked);
    setSecretBadge(picked);

    setIsDrawing(false);
    alert(`🎉 你抽到了：${picked}`);
  };


  const handleJoin = async (activityId: string) => {
    if (!currentUser) { alert("请先登录"); return; }
    if (!requireStrongPwd()) return;

    const act = activities.find(x => x._id === activityId);
    if (!act) { alert("活动不存在或已刷新"); return; }

    setPendingJoin(act);
    setShowJoinConfirm(true);
  };

  const confirmJoin = async () => {
    if (!pendingJoin) return;

    setIsLoading(true);
    try {
      const res = await cloud.invoke("join-activity", { activityId: pendingJoin._id, username: currentUser });
      if (res?.ok) {
        setShowJoinConfirm(false);
        setPendingJoin(null);
        fetchActivities();
        alert("加入成功！");
      } else {
        alert(res?.msg || "加入失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setIsLoading(false);
    }
  };

  const openRoom = (a: Activity) => {
    console.log("[openRoom] set", a._id, a.title);

    // Optimistically bump view count so list reflects latest.
    setActivities(prev => prev.map(item => item._id === a._id ? { ...item, view_count: (item.view_count || 0) + 1 } : item));

    cloud
      .invoke("activity-ops", { type: "view", activityId: a._id })
      .catch(console.error);

    setRoomActivity(a);
    setRoomOpen(true);

    if (currentUser && a._id !== "global-square") {
      cloud.invoke("user-ops", {
        type: "read-room",
        username: currentUser,
        activityId: a._id,
      });
      setReadCursors(prev => ({ ...prev, [a._id]: a.msg_count || 0 }));
    }
  };

  const openGlobalSquare = () => {
    const fakeActivity: Activity = {
      _id: "global-square",
      title: "🌍 聊天大广场",
      description: "所有人都在这里，消息保留 24 小时。畅所欲言吧！",
      max_people: 9999,
      time: "24h Online",
      location: "云端",
      author: "System",
      category: "大厅",
      joined_users: [],
      status: "active",
    };

    setRoomActivity(fakeActivity);
    setRoomOpen(true);
  };

  const closeRoom = () => {
    setRoomOpen(false);
    setRoomActivity(null);
  };

  const handleQuit = async (activityId: string) => {
    if (!window.confirm("确定要退出？")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("quit-activity", { activityId, username: currentUser });
      if (res.ok) { alert("已退出"); fetchActivities(); } else { alert(res.msg); }
    } catch { alert("网络错误"); } finally { setIsLoading(false); }
  };

  const handleCommonOp = async (opName: string, activityId: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke(opName, { activityId, username: currentUser });
      if (res.ok) { fetchActivities(); if(opName==='hide-activity') setActivities(prev=>prev.filter(a=>a._id!==activityId)); } 
      else alert(res.msg || "失败");
    } catch { alert("网络错误"); } finally { setIsLoading(false); }
  };

  const handleToggleRecruit = async (activityId: string) => {
    setIsLoading(true);
    try {
      const res = await cloud.invoke("toggle-lock", { activityId, username: currentUser });
      if (res.ok) fetchActivities();
      else alert(res.msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDissolve = async (activityId: string) => {
    if (!window.confirm("确定解散？解散后活动立刻失效并从广场消失")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("cancel-activity", { activityId, username: currentUser });
      if (res.ok) fetchActivities();
      else alert(res.msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    if (!window.confirm("确定完成活动？完成后将从广场消失，并进入历史")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("complete-activity", { activityId, username: currentUser });
      if (res?.ok) fetchActivities();
      else alert(res?.msg || "操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 处理从广场/通知跳转到具体活动
  const handleSquareJump = (activityId: string, msgId?: string) => {
    if (msgId) setTargetMsgId(msgId); else setTargetMsgId("");
    // 如果是大广场，直接打开
    if (activityId === "global-square") {
      openGlobalSquare();
      return;
    }

    const target = activities.find(a => a._id === activityId);
    if (!target) {
      alert("该活动可能已结束或被删除");
      return;
    }
    const isMember = (target.joined_users || []).includes(currentUser) || target.author === currentUser;
    if (isMember) {
      setRoomActivity(target);
      setRoomOpen(true);
    } else {
      setRoomOpen(false);
      setRoomActivity(null);
      setTimeout(() => {
        setPendingJoin(target);
        setShowJoinConfirm(true);
      }, 50);
    }
  };

  const handleAckCancelled = async (activityId: string) => {
    setIsLoading(true);
    try {
      const res = await cloud.invoke("ack-activity-deleted", { activityId, username: currentUser });
      if (res?.ok) {
        fetchActivities();
      } else {
        alert(res?.msg || "操作失败");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const goToContact = () => {
    setActiveTab("profile");
    setTimeout(() => setShowContactModal(true), 120);
  };

  const sendCode = async () => {
    if (!verifyEmail.endsWith("nju.edu.cn")) { alert("请使用 @smail.nju.edu.cn 或 @nju.edu.cn 结尾的邮箱"); return; }
    setIsSendingCode(true);
    try {
      const res = await cloud.invoke("verify-email", { type: 'send', email: verifyEmail, username: currentUser });
      if (res.ok) alert("验证码已发送，请查收邮件"); else alert(res.msg);
    } catch { alert("发送失败"); } finally { setIsSendingCode(false); }
  };

  const verifyCodeAction = async () => {
    if(!verifyCode) return;
    try {
      const res = await cloud.invoke("verify-email", { type: 'verify', email: verifyEmail, code: verifyCode, username: currentUser });
      if (res.ok) { 
        alert("认证成功！");
        setUserData(prev => prev ? { ...prev, is_verified: true, edu_email: verifyEmail } : null);
        // fetchUserData(currentUser); 
      } else {
        alert(res.msg);
      }
    } catch { alert("验证失败"); }
  };

  const saveProfile = async () => {
    if (!requireStrongPwd()) return;
    try {
      const res = await cloud.invoke("user-ops", { type: 'update-profile', username: currentUser, profile: tempProfile });
      if (res.ok) { alert("档案已保存"); setUserData(prev => prev ? {...prev, profile: tempProfile} : null); setIsEditingProfile(false); }
    } catch { alert("保存失败"); }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!requireStrongPwd()) return;

    const title = (activityDraft.title || "").trim();
    const location = (activityDraft.location || activeScene).trim();
    const description = (activityDraft.description || "").trim();
    const category = activeCategory || CATEGORY_OPTIONS[0];
    const { minVal, maxVal } = normalizePeople();
    const timeString = activeTime || inputTimeStr.trim();
    const soulQuestionValue = (soulQuestion || "").trim();
    if (soulQuestionValue.length > 40) { alert("灵魂一问最多 40 字"); return; }

    // ✅ 前端兜底校验（避免请求后端才提示）
    if (!title) { alert("❌ 标题不能为空"); return; }
    if (!location) { alert("❌ 地点不能为空"); return; }
    if (!timeString) { alert("⏰ 请填写时间"); return; }
    if (minVal < 2) { alert("❌ 至少 2 人"); return; }
    if (maxVal < minVal) { alert("❌ 人数设置错误"); return; }

    const requirementGender =
      genderLimit === "仅女生" ? "female_only" :
      genderLimit === "仅男生" ? "male_only" : "any";
    const requirementIdentity =
      identityLimit === "本科" ? "undergrad" :
      identityLimit === "研究生" ? "graduate" :
      identityLimit === "博士" ? "PhD" : "any";
    const requirementStranger = reqDraft.stranger || "ok";

    const newActivity = {
      title,
      description,
      category,
      max_people: maxVal,
      min_people: minVal,
      time: timeString,
      location,
      author: currentUser,
      requires_verification: !!isVerifiedOnly,
      requirements: {
        gender: requirementGender,
        identity: requirementIdentity,
        stranger: requirementStranger,
        vibe: reqDraft.vibe || [],
        host_flags: reqDraft.host_flags || [],
      },
      soul_question: soulQuestionValue,
      tags,
      topic: "",
    };

    setIsLoading(true);
    try {
      console.log("[create] payload=", newActivity);
      const res = await cloud.invoke("create-activity", newActivity);
      console.log("[create] res=", res);

      if (res?.ok) {
        setShowCreateModal(false);
        resetCreateDraft();
        fetchActivities();
      } else {
        alert("发布失败：" + (res?.msg || "未知错误"));
      }
    } catch (e: unknown) {
      console.error(e);
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
      alert("发布失败（invoke 异常）：" + errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUsername = async (e: React.FormEvent) => { e.preventDefault(); if(!loginName.trim())return; setIsLoading(true); setLoginError(""); try{const res=await cloud.invoke("user-ops",{type:'check',username:loginName.trim()});if(res&&res.exists)setLoginStep("nameTaken");else setLoginStep("createAccount");}catch{setLoginError("连接失败")}finally{setIsLoading(false);} };
  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'login',username:loginName.trim(),password:loginPassword});if(res&&res.ok){const need=!!res.need_pwd_change;setNeedPwdChange(need);localStorage.setItem("club_need_pwd_change",need?"1":"0");localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());fetchUserData(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"密码错误");setIsLoading(false);} };
  const handleRegister = async (e: React.FormEvent) => { e.preventDefault(); if(loginPassword.length<5){setLoginError("密码至少 5 位");setIsLoading(false);return;} setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'register',username:loginName.trim(),password:loginPassword});if(res&&res.ok){const need=!!res.need_pwd_change;setNeedPwdChange(need);localStorage.setItem("club_need_pwd_change",need?"1":"0");localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());fetchUserData(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"注册失败");setIsLoading(false);} };
  const handleLogout = () => { localStorage.removeItem("club_username"); localStorage.removeItem("club_need_pwd_change"); setNeedPwdChange(false); setCurrentUser(""); setUserData(null); setVerifyEmail(""); setVerifyCode(""); setTempProfile({}); setIsEditingProfile(false); setShowLoginModal(true); setLoginStep("inputName"); setLoginName(""); setLoginPassword(""); };
  const resetToInputName = () => { setLoginStep("inputName"); setLoginError(""); setLoginPassword(""); };

  const CategoryBar = ({ value, onChange }: { value: "全部" | CategoryType; onChange: (c: "全部" | CategoryType) => void }) => (
    <div
      className="no-scrollbar overflow-x-auto whitespace-nowrap scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="flex gap-3">
        {(["全部", ...CATEGORY_OPTIONS] as const).map(cat => (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`shrink-0 snap-start px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              value === cat ? `${theme.primary} text-white shadow-md` : "bg-white text-gray-500 border border-gray-100"
            }`}
          >
            {cat === "全部" ? cat : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
    </div>
  );

  const ActivityCard = ({ activity, showJoinBtn = true, showSweepBtn = false }: { activity: Activity, showJoinBtn?: boolean, showSweepBtn?: boolean }) => {
    const [expanded, setExpanded] = useState(false);
    const joined = activity.joined_users || [];
    const isJoined = joined.includes(currentUser);
    const isAuthor = activity.author === currentUser; 
    const isFull = joined.length >= activity.max_people;
    const minP = activity.min_people || 1;
    const st = activity.status || 'active';
    const isDone = st === 'done';
    const isCancelled = st === 'cancelled';
    const isLocked = st === 'locked';
    const isActive = st === 'active';
    const isHidden = (activity.hidden_by || []).includes(currentUser);
    const isGhost = isHidden;
      const canFinish = joined.length >= minP;
    const unread = getUnreadCount(activity);
    const displayCategory = normalizeCategory(activity.category);

    const actionButtons: React.ReactNode[] = [];
    actionButtons.push(
      <button
        key="room"
        type="button"
        onClick={() => openRoom(activity)}
        className="px-6 py-2 rounded-xl text-sm font-bold bg-black text-white shadow active:scale-95"
      >
        进入房间
      </button>
    );

    const req = activity.requirements;
    const reqTags: string[] = [];

    if (req) {
      if (req.gender === "female_only") reqTags.push("仅女生");
      else if (req.gender === "male_only") reqTags.push("仅男生");

      if (req.identity === "undergrad") reqTags.push("本科");
      else if (req.identity === "graduate") reqTags.push("研究生");

      if (req.stranger === "new_friends") reqTags.push("想认识新朋友");
      else if (req.stranger === "has_circle") reqTags.push("有熟人也欢迎");

      const vibeMap: Record<string, string> = {
        quiet: "偏安静",
        lively: "偏热闹",
        casual: "轻松随意",
        serious: "比较认真",
        i_friendly: "I人友好",
        e_friendly: "E人友好",
      };
      (req.vibe || []).slice(0, 2).forEach(k => reqTags.push(vibeMap[k] || k));

      const hostMap: Record<string, string> = {
        welcome_first_timer: "欢迎新手",
        welcome_solo: "欢迎一个人来",
        chat_before_decide: "可先聊再决定",
        will_reply: "会在局内回复",
        no_gender_mind: "不介意性别/专业",
      };
      (req.host_flags || []).slice(0, 1).forEach(k => reqTags.push(hostMap[k] || k));
    }

    if (isAuthor) {
      if (isDone) {
        actionButtons.push(
          <button key="done" className="px-6 py-2 rounded-xl text-sm font-bold bg-green-100 text-green-600" disabled>
            已完成
          </button>
        );
      } else if (isLocked) {
        actionButtons.push(
          <button key="reopen" onClick={() => handleToggleRecruit(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white shadow">
            撤回继续召集
          </button>
        );
        actionButtons.push(
          <button key="complete" onClick={() => handleCompleteActivity(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-green-500 text-white shadow">
            确定完成
          </button>
        );
      } else if (isActive) {
        if (canFinish) {
          actionButtons.push(
            <button key="lock" onClick={() => handleToggleRecruit(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-green-500 text-white shadow-md">
              结束召集
            </button>
          );
        } else {
          actionButtons.push(
            <button key="recruiting" className="px-6 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-400" disabled>
              招募中
            </button>
          );
        }
      }
    } else {
      if (isCancelled) {
        actionButtons.push(
          <button key="ack" onClick={() => handleAckCancelled(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-500">
            知道了
          </button>
        );
      } else if (isJoined) {
        actionButtons.push(
          <button key="quit" onClick={() => handleQuit(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-500">
            退出
          </button>
        );
      } else if (showJoinBtn) {
        if (isFull) {
          actionButtons.push(
            <button key="full" className="px-6 py-2 rounded-xl text-sm font-bold bg-gray-200 text-gray-400" disabled>
              已满员
            </button>
          );
        } else {
          actionButtons.push(
            <button key="join" onClick={() => handleJoin(activity._id)} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${theme.primary} text-white shadow-md active:scale-95`}>
              加入
            </button>
          );
        }
      }
    }

    return (
      <div className={`${theme.card} rounded-[2rem] p-6 shadow-sm border ${theme.border} mb-4 relative ${isGhost ? "opacity-60 grayscale border-dashed" : ""} ${isDone && !isGhost ? "border-l-4 border-l-green-500" : ""}`}>
        {!isGhost && showSweepBtn && (isCancelled || isDone) && <button onClick={() => handleCommonOp("hide-activity", activity._id, "移除?")} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full"><Eraser size={16} /></button>}
        
        <div className="flex justify-between items-start mb-3 pr-10">
          <div className="flex gap-2 items-center mb-1">
             <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${CATEGORY_BADGE_STYLES[displayCategory]}`}>{CATEGORY_LABELS[displayCategory]}</span>
             {activity.requires_verification && <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-100 text-purple-600 flex items-center gap-1"><ShieldCheck size={10}/> 仅限认证</span>}
          </div>
          <div className="flex items-center gap-2">
            {isAuthor && (
              <button
                type="button"
                onClick={() => handleDissolve(activity._id)}
                className="px-3 py-1 rounded-lg text-[11px] font-black bg-red-50 text-red-600"
              >
                解散
              </button>
            )}
            <span className={`text-xs font-bold px-2 py-1.5 rounded-full flex items-center gap-1 bg-gray-100 text-gray-500`}>
              <Eye size={12} /> {activity.view_count || 0}
            </span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${theme.badge}`}><User size={12} /> {joined.length}/{activity.max_people}</span>
          </div>
        </div>
        <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
          {activity.title}
          {unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </h3>
        {reqTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {reqTags.slice(0, 6).map((t) => (
              <span
                key={t}
                className="text-[10px] font-black px-2 py-1 rounded-full bg-gray-100 text-gray-600"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {(activity.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {(activity.tags || []).slice(0, 3).map(t => (
              <span key={t} className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-black">
                #{t}
              </span>
            ))}
          </div>
        )}
        <div className="mb-4"><p onClick={() => setExpanded(!expanded)} className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap">{expanded ? activity.description : (activity.description||"").slice(0, 50) + "..."}</p></div>
        <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-2 text-sm font-bold ${theme.icon}`}><Calendar size={14}/> {activity.time}</div>
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold"><MapPin size={14}/> {activity.location}</div>
                <div className="flex gap-2 flex-wrap justify-end items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPosterTarget(activity);
                    }}
                    className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 active:scale-95 transition-transform"
                  >
                    <Share2 size={16} />
                  </button>
                  {actionButtons}
                </div>
            </div>
        </div>
      </div>
    );
  };

  // --- 成就组件 ---
  const AchievementCard = () => {
    const isUnlocked = userActivityCount >= 10;
    const progress = Math.min((userActivityCount / 10) * 100, 100);

    return (
      <div className={`rounded-[2rem] p-6 mb-6 shadow-sm border relative overflow-hidden ${isUnlocked ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200" : "bg-white border-gray-100"}`}>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h3 className={`font-bold text-lg flex items-center gap-2 ${isUnlocked ? "text-yellow-700" : "text-gray-800"}`}>
            {isUnlocked ? <Crown size={20} className="text-yellow-500" /> : <Trophy size={20} className="text-gray-400" />}
            {isUnlocked ? "南大社交达人" : "成就进度"}
          </h3>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isUnlocked ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
            {isUnlocked ? "已解锁皮肤" : "未解锁"}
          </span>
        </div>
        
        <div className="relative z-10">
           <div className="flex justify-between text-xs font-bold mb-2 text-gray-500">
             <span>参与活动</span>
             <span>{userActivityCount} / 10</span>
           </div>
           <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
             <div className={`h-full rounded-full transition-all duration-1000 ${isUnlocked ? "bg-yellow-400" : "bg-blue-500"}`} style={{ width: `${progress}%` }}></div>
           </div>
           {!isUnlocked && <p className="text-[10px] text-gray-400 mt-2 font-bold">🎯 达成 10 次即可解锁 [南大紫] 专属界面</p>}
        </div>
        
        {/* 背景装饰 */}
        <Star className={`absolute -bottom-4 -right-4 w-24 h-24 rotate-12 ${isUnlocked ? "text-yellow-500/10" : "text-gray-500/5"}`} />
      </div>
    );
  };

  const SecretAchievementCard = () => {
    if (!userData?.is_verified) return null;

    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowSecret(v => !v)}
          className="w-full p-5 flex items-center justify-between active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${secretBadge ? "bg-yellow-50" : "bg-gray-50"}`}>
              {secretBadge ? <Sparkles className="text-yellow-600" size={18} /> : <Gift className="text-gray-500" size={18} />}
            </div>
            <div className="text-left">
              <div className="font-black text-sm flex items-center gap-2">
                隐藏成就：社团会员盲盒
                {!secretBadge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white">NEW</span>}
              </div>
              <div className="text-[11px] font-bold text-gray-400">
                加入微信群，抽取随机特殊徽章（盲盒）
              </div>
            </div>
          </div>

          <div className="text-right text-[10px] font-bold text-gray-400">
            {secretDeadlineLabel}
          </div>
        </button>

        <div
          className={`px-5 pb-5 transition-all duration-300 ${
            showSecret ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 font-black text-sm mb-2">
              <QrCode size={16} className="text-gray-600" />
              扫码进群（限认证校友）
            </div>

            <div className="text-[11px] font-bold text-gray-500 leading-relaxed mb-3">
              进群后你就是【区块链 + AI 大模型金科大赛社团】会员。<br />
              会员可抽取随机【特殊徽章】（盲盒）。
            </div>

            <div className="flex items-center justify-center rounded-2xl bg-white p-4 border border-gray-100">
              <img
                src={code4teamQR}
                alt="区块链 + AI 大模型金科大赛社团群二维码"
                className="w-full max-w-[260px] rounded-xl transition opacity-100"
              />
            </div>

            <div className="mt-3 text-[11px] font-black text-red-500">
              {secretDeadlineLabel} 前有效，加入我们，在群里可以找到开发者给出你的创新建议～
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-100 p-4 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-black text-sm">会员盲盒徽章</div>
                <div className="text-[11px] font-bold text-gray-400">
                  每人一次抽取机会（永久保存）
                </div>
              </div>

              <button
                onClick={drawSecretBadge}
                disabled={isDrawing || !!secretBadge}
                className={`px-4 py-2 rounded-xl text-xs font-black transition active:scale-95 ${
                  secretBadge
                    ? "bg-green-50 text-green-600 cursor-default"
                    : isDrawing
                    ? "bg-black text-white opacity-70"
                    : "bg-black text-white"
                }`}
              >
                {secretBadge ? "已抽取" : isDrawing ? "开奖中..." : "抽一次"}
              </button>
            </div>

            {secretBadge ? (
              <div className="mt-3 bg-yellow-50 border border-yellow-100 rounded-2xl p-3">
                <div className="text-[11px] font-bold text-yellow-700">你获得的特殊徽章</div>
                <div className="text-lg font-black text-yellow-800 mt-1">{secretBadge}</div>
                <div className="text-[10px] font-bold text-yellow-600 mt-1">
                  这是你的专属奖励！欢迎你的加入 ✨
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[11px] font-bold text-gray-400">
                扫码进群后，点击【抽一次】领取你的盲盒徽章～
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen ${theme.bg} ${theme.textMain} font-sans pb-32 transition-colors duration-500`}
    >
      <style>{`
      @keyframes floatIn {
        0% { transform: translateY(10px) scale(0.98); opacity: 0; }
        100% { transform: translateY(0) scale(1); opacity: 1; }
      }
      @keyframes flash-highlight {
        0% { background-color: #fde047; }
        100% { background-color: transparent; }
      }
      .animate-flash {
        animation: flash-highlight 2s ease-out forwards;
      }
    `}</style>
      {showLoginModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center"><h2 className="text-3xl font-black mb-8">ClubDAO</h2>{loginStep==="inputName"&&(<form onSubmit={checkUsername}><input autoFocus value={loginName} onChange={e=>setLoginName(e.target.value)} placeholder="代号" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">下一步</button></form>)}{loginStep==="nameTaken"&&(<div className="space-y-4"><div className="bg-orange-50 text-orange-600 p-4 rounded-xl text-sm font-bold">该代号已存在</div><button onClick={()=>setLoginStep("inputPassword")} className="w-full bg-black text-white p-4 rounded-xl font-bold">是本人，去登录</button><button onClick={resetToInputName} className="w-full bg-white border p-4 rounded-xl font-bold">换个名字</button></div>)}{loginStep==="inputPassword"&&( <form onSubmit={handleLogin}><input autoFocus type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="密码" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">登录</button></form>)}{loginStep==="createAccount"&&(<form onSubmit={handleRegister}><input autoFocus value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="设个密码" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">注册并登录</button></form>)}{loginError&&<p className="text-red-500 mt-4 font-bold">{loginError}</p>}</div></div>)}
      {showContactModal && <ContactModal />}
      <AnnouncementModal onAction={goToContact} />
      
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${theme.primary}`}>
            C
          </div>

          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-xl ${theme.primaryText}`}>
                {activeTab === "square"
                  ? "ClubDAO"
                  : activeTab === "my_activities"
                  ? "我的局"
                  : activeTab === "admin"
                  ? "管理"
                  : "我的"}
              </span>

              {/* 官方出品标识 */}
              <span className="px-2 py-1 rounded-md bg-black text-white text-[10px] font-black flex items-center gap-1">
                <BadgeCheck size={12} />
                官方出品
              </span>
            </div>

            {/* 官方主体名称（唯一权威来源） */}
            <span className="text-[10px] text-gray-500 font-black">
              南京大学区块链 + AI 与金融科技创新俱乐部 · 官方推出
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={goToContact}
            className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 active:scale-95"
          >
            <span role="img" aria-label="idea">💡</span>
            <span className="hidden sm:inline">我想提建议</span>
          </button>
          <button
            onClick={() => setShowThemeModal(true)}
            className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center"
          >
            <Palette size={14} />
          </button>

          <div className="bg-white border px-3 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${theme.accent}`}>
              <User size={14} />
            </div>
            {currentUser}
          </div>
        </div>
      </nav>
      
      <main className="p-6 max-w-md mx-auto space-y-6">
        {activeTab === 'square' && (
          <div className="animate-fade-in space-y-6">
            <div className="relative group"><Search className="absolute left-4 top-3.5 text-gray-400" size={20} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="寻找下一场活动..." className="w-full bg-white pl-12 pr-4 py-3 rounded-2xl font-bold outline-none shadow-sm" /></div>

            <button 
              onClick={openGlobalSquare}
              className={`w-full mb-4 mt-2 rounded-2xl p-4 shadow-lg active:scale-95 transition-transform flex items-center justify-between ${squareEntrySkin.card}`}
            >
              <div className="text-left">
                <div className="font-black text-lg flex items-center gap-2">
                  🌍 聊天大广场 <span className={`text-[10px] px-2 py-0.5 rounded-full ${squareEntrySkin.chip}`}>LIVE</span>
                </div>
                <div className={`text-xs font-bold mt-1 ${squareEntrySkin.sub}`}>
                  全服热聊中，点击加入讨论...
                </div>
              </div>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-sm ${squareEntrySkin.icon}`}>
                <span className="text-xl">💬</span>
              </div>
            </button>

            {/* 社团官方公告 */}
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${theme.primary}`}>
                    <Megaphone size={18} />
                  </div>

                  <div>
                    <div className="font-black text-sm text-gray-900">
                      南京大学区块链 + AI 与金融科技创新俱乐部 · 官方推出
                    </div>

                    <div className="text-xs text-gray-500 font-bold mt-1 leading-relaxed">
                      本平台为俱乐部官方活动与社群入口。  
                      校园邮箱认证后可解锁隐藏成就，并随机获得限定徽章（盲盒）。
                    </div>

                    <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black">
                      ⏳ 限时开放：{secretDeadlineChip}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("profile")}
                  className="px-4 py-2 rounded-xl bg-black text-white text-xs font-black active:scale-95 whitespace-nowrap"
                >
                  立即领取
                </button>
              </div>
            </div>

            {tagFilter && (
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-bold"
                  onClick={() => setTagFilter("")}
                >
                  清除标签筛选
                </button>
              </div>
            )}

            <CategoryBar
              value={categoryFilter}
              onChange={(cat) => {
                setCategoryFilter(cat);
                setTagFilter("");
              }}
            />
            <div>{squareList.length === 0 && !isLoading && <div className="text-center py-12 text-gray-300 font-bold">暂无活动</div>}{squareList.map(activity => <ActivityCard key={activity._id} activity={activity} showJoinBtn={true} />)}</div>
          </div>
        )}
        
        {activeTab === 'my_activities' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-gray-100">
              <button onClick={() => setActivitySubTab('ongoing')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${activitySubTab==='ongoing' ? 'bg-black text-white shadow' : 'text-gray-400'}`}>
                正在进行 ({myOngoingList.length})
              </button>
              <button onClick={() => setActivitySubTab('history')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${activitySubTab==='history' ? 'bg-black text-white shadow' : 'text-gray-400'}`}>
                历史活动 ({myHistoryList.length})
              </button>
            </div>

            {activitySubTab === 'ongoing' && (
              <div>
                {myOngoingList.length === 0 && <div className="text-center py-12 text-gray-300 font-bold">暂无进行中的活动</div>}
                {myOngoingList.map(a => (
                  <ActivityCard key={a._id} activity={a} showJoinBtn={false} showSweepBtn={false} />
                ))}
              </div>
            )}

            {activitySubTab === 'history' && (
              <div>
                {myHistoryList.length === 0 && <div className="text-center py-12 text-gray-300 font-bold">还没有历史活动</div>}
                {myHistoryList.map(a => (
                  <div key={a._id}>
                    <ActivityCard activity={a} showJoinBtn={false} showSweepBtn={false} />
                    <div className="flex justify-end -mt-2 mb-6">
                      <button
                        onClick={() => handleCommonOp("hide-activity", a._id, "移除这条回忆？（仅对你隐藏）")}
                        className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === "admin" && isAdminUser && (
          <div className="animate-fade-in space-y-6">
            <AdminView currentUser={currentUser} cloud={cloud} onClose={() => setActiveTab("square")} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-fade-in space-y-6">
            {/* 头部卡片 */}
            <div className={`rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden text-white transition-colors duration-500 ${theme.primary}`}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{currentUser}</h1>

                  {/* ✅ 隐藏成就徽章：抽到才显示 */}
                  {secretBadge && (
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                        isFounder ? "bg-yellow-400 text-yellow-950" : "bg-black/20 text-white/90"
                      }`}
                    >
                      <Sparkles size={12} className={isFounder ? "text-yellow-900" : "text-yellow-300"} />
                      {secretBadge}
                    </span>
                  )}

                  {userData?.is_verified ? (
                    <div className="px-2 py-1 bg-yellow-400 text-yellow-900 text-[10px] font-black rounded-md flex items-center gap-1">
                      <ShieldCheck size={12}/> 已认证
                    </div>
                  ) : (
                    <div className="px-2 py-1 bg-black/20 text-white/70 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <Shield size={12}/> 未认证
                    </div>
                  )}
                </div>
                <p className="text-white/80 text-sm mb-6">{userData?.profile?.intro || "这个人很懒，还没写自我介绍..."}</p>
                <div className="flex gap-4 text-center">
                  <div><p className="text-2xl font-bold">{userActivityCount}</p><p className="text-[10px] opacity-60">总参与</p></div>
                  <div><p className="text-2xl font-bold">{userData?.is_verified ? 'V' : 'X'}</p><p className="text-[10px] opacity-60">校友</p></div>
                </div>
              </div>
              <Zap className="absolute right-[-20px] top-[-20px] opacity-20 rotate-12" size={160} />
            </div>

            {/* 成就系统卡片 */}
            {needPwdChange && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100">
                <div className="font-black text-sm text-red-600 mb-2">🔒 安全升级：请修改密码</div>
                <div className="text-xs text-gray-500 font-bold leading-relaxed">
                  你的旧密码长度小于 5 位。为保证账号安全，需升级为至少 5 位的新密码后，才能创建/加入活动等关键操作。
                </div>
                <button
                  onClick={() => {
                    const oldPassword = window.prompt("请输入旧密码：") || "";
                    const newPassword = window.prompt("请输入新密码（至少5位）：") || "";
                    if (!oldPassword || !newPassword) return;

                    (async () => {
                      const res = await cloud.invoke("user-ops", {
                        type: "change-password",
                        username: currentUser,
                        oldPassword,
                        newPassword,
                      });
                      if (res?.ok) {
                        alert("✅ 密码已升级");
                        setNeedPwdChange(false);
                        localStorage.setItem("club_need_pwd_change", "0");
                      } else {
                        alert(res?.msg || "修改失败");
                      }
                    })();
                  }}
                  className="mt-4 w-full py-3 bg-black text-white rounded-xl font-black text-sm active:scale-95"
                >
                  立即升级密码
                </button>
              </div>
            )}

            <AchievementCard />
            <SecretAchievementCard />

            {/* 联系与共建入口卡片 */}
            <div
              onClick={() => setShowContactModal(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] p-1 shadow-lg cursor-pointer active:scale-[0.98] transition-transform group"
            >
              <div className="bg-white rounded-[1.8rem] p-5 relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500">
                      <Coffee size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="font-black text-base text-gray-900 flex items-center gap-2">
                        联系与共建
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-full">New</span>
                      </div>
                      <div className="text-xs text-gray-500 font-bold mt-1">
                        提建议、找Bug、或者单纯想加入我们？
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </div>
                <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-50 blur-xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            </div>

            {/* 认证卡片 (仅当未认证时显示) */}
            {!userData?.is_verified && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-purple-100">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-800"><Mail size={18}/> 校园邮箱认证</h3>
                <div className="space-y-3">
                  <input value={verifyEmail} onChange={e=>setVerifyEmail(e.target.value)} placeholder="学号@smail.nju.edu.cn" className="w-full bg-purple-50 p-3 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-purple-200"/>
                  <div className="flex gap-2">
                    <input value={verifyCode} onChange={e=>setVerifyCode(e.target.value)} placeholder="6位验证码" className="flex-1 bg-purple-50 p-3 rounded-xl font-bold text-sm outline-none"/>
                    <button onClick={sendCode} disabled={isSendingCode} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs whitespace-nowrap">{isSendingCode?"发送中":"获取验证码"}</button>
                  </div>
                  <button onClick={verifyCodeAction} className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm mt-2">提交认证</button>
                </div>
              </div>
            )}

            {/* 个人档案 */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">个人档案</h3>
                <button onClick={()=>{if(isEditingProfile)saveProfile();setIsEditingProfile(!isEditingProfile);}} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  {isEditingProfile ? <Save size={18} className="text-green-600"/> : <Edit3 size={18} className="text-gray-500"/>}
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">性别</label>
                     {isEditingProfile ? (
                       <select value={tempProfile.gender||"保密"} onChange={e=>setTempProfile({...tempProfile, gender: e.target.value as UserProfile["gender"]})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none"><option>男</option><option>女</option><option>保密</option></select>
                     ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.gender||"未填写"}</div>}
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">年级</label>
                     {isEditingProfile ? (
                       <select value={tempProfile.grade||""} onChange={e=>setTempProfile({...tempProfile, grade: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none"><option value="">请选择</option><option>本科大一</option><option>本科大二</option><option>本科大三</option><option>本科大四</option><option>硕士研究生</option><option>博士研究生</option></select>
                     ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.grade||"未填写"}</div>}
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">MBTI</label>

                  {isEditingProfile ? (
                    <select
                      value={tempProfile.mbti || ""}
                      onChange={(e) => setTempProfile({ ...tempProfile, mbti: e.target.value })}
                      className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none"
                    >
                      <option value="">不填写</option>
                      {[
                        "INTJ","INTP","ENTJ","ENTP",
                        "INFJ","INFP","ENFJ","ENFP",
                        "ISTJ","ISFJ","ESTJ","ESFJ",
                        "ISTP","ISFP","ESTP","ESFP"
                      ].map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">
                      {userData?.profile?.mbti || "未填写"}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">微信号 (WeChat)</label>
                   {isEditingProfile ? (
                     <input 
                       value={tempProfile.wechat_id||""} 
                       onChange={e=>setTempProfile({...tempProfile, wechat_id: e.target.value})} 
                       className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-green-500/30 focus:bg-white transition-all" 
                       placeholder="填写微信号，方便搭子联系你"
                     />
                   ) : (
                     <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm font-bold">
                       <span>{userData?.profile?.wechat_id || "未填写"}</span>
                       {userData?.profile?.wechat_id && <span className="text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded">联系方式</span>}
                     </div>
                   )}
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">来自城市</label>
                   {isEditingProfile ? (
                     <input value={tempProfile.city||""} onChange={e=>setTempProfile({...tempProfile, city: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none" placeholder="例如：江苏南京"/>
                   ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.city||"未填写"}</div>}
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">兴趣爱好</label>
                   {isEditingProfile ? (
                     <input value={tempProfile.hobbies||""} onChange={e=>setTempProfile({...tempProfile, hobbies: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none" placeholder="例如：羽毛球、摄影、德州扑克"/>
                   ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.hobbies||"未填写"}</div>}
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">自我介绍</label>
                   {isEditingProfile ? (
                     <textarea value={tempProfile.intro||""} onChange={e=>setTempProfile({...tempProfile, intro: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none h-24 resize-none" placeholder="想找什么样的搭子？"/>
                   ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold whitespace-pre-wrap">{userData?.profile?.intro||"未填写"}</div>}
                </div>
              </div>
            </div>

            {/* 历史记录：不再是混在一起的，而是分两个 Tab */}
            <div className="mt-8 mb-4 flex justify-center"><button onClick={handleLogout} className="px-6 py-2 bg-gray-100 text-gray-400 rounded-full font-bold text-xs hover:bg-red-50 hover:text-red-500 transition-colors">退出登录</button></div>
          </div>
        )}
      </main>

      {/* 悬浮按钮与底部导航 */}
      {activeTab === 'square' && (
        <button
          onClick={() => { resetCreateDraft(); setShowCreateModal(true); }}
          className={`fixed bottom-24 right-6 z-30 group active:scale-95 transition-all duration-300 rounded-full ${fabSkin.shellShadow}`}
        >
          <div className="relative overflow-hidden rounded-full p-[2px] flex items-center justify-center w-[88px] h-[44px]">
            <div className={`absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-[spin_3s_linear_infinite] ${fabSkin.ring}`} />
            <div className={`relative z-10 w-full h-full rounded-full flex items-center justify-center gap-1 transition-colors ${fabSkin.inner}`}>
              <span
                className={`font-black text-[15px] tracking-[0.15em] ml-1.5 ${fabSkin.label}`}
                style={{ fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}
              >
                组局
              </span>
              <svg className={`w-3.5 h-3.5 ${fabSkin.plus}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </button>
      )}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 pb-safe pt-2 px-6 flex justify-around items-center z-50 h-20">
        <button onClick={() => setActiveTab('square')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'square' ? theme.navActive : theme.navInactive}`}><Home size={24} strokeWidth={activeTab === 'square' ? 3 : 2} /><span className="text-[10px] font-bold">广场</span></button>
        <button onClick={() => setActiveTab('my_activities')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'my_activities' ? theme.navActive : theme.navInactive}`}><LayoutGrid size={24} strokeWidth={activeTab === 'my_activities' ? 3 : 2} /><span className="text-[10px] font-bold">我的局</span></button>
        <button
          onClick={() => setShowNotifyModal(true)}
          className="flex flex-col items-center gap-1 w-16 relative transition-colors text-gray-400"
        >
          <div className="relative">
            <div className="text-xl">🔔</div>
            {notifications.length > 0 && (
              <span className={`absolute -top-1 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce ${navUiSkin.notifyBadge}`}>
                {notifications.length > 99 ? "99+" : notifications.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">通知</span>
        </button>
        {ADMIN_USERS.includes(currentUser) && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === "admin" ? navUiSkin.adminActive : navUiSkin.adminInactive}`}
          >
            <ShieldAlert size={24} strokeWidth={activeTab === "admin" ? 3 : 2} />
            <span className="text-[10px] font-bold">Admin</span>
          </button>
        )}
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'profile' ? theme.navActive : theme.navInactive}`}><User size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} /><span className="text-[10px] font-bold">我的</span></button>
      </div>

      {/* 主题弹窗 */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-slide-up">
            <h3 className="text-xl font-black mb-6 text-center">选择界面风格</h3>
            <div className="flex gap-4 justify-center mt-6">
              {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
                const t = THEMES[key];
                return (
                <button
                  key={t.id}
                  onClick={() => handleSetTheme(key)}
                  className={`relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm transition-transform active:scale-95 ${t.bg} border-2 ${currentTheme === t.id ? t.border : "border-transparent"}`}
                >
                  <div className="flex gap-1">
                    <div className={`w-3 h-3 rounded-full ${t.primary}`} />
                    <div className={`w-3 h-3 rounded-full ${t.badge.split(" ")[0]}`} />
                  </div>
                  <span className={`text-[10px] font-bold mt-1 ${t.textMain}`}>{t.name}</span>
                </button>
                );
              })}
            </div>
            <button onClick={() => setShowThemeModal(false)} className="w-full mt-6 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">
              关闭
            </button>
          </div>
        </div>
      )}
      
      {showJoinConfirm && pendingJoin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 animate-slide-up">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-xs font-black text-gray-400">加入前确认</div>
                <div className="text-xl font-black mt-1">{pendingJoin.title}</div>
                <div className="text-xs font-bold text-gray-500 mt-1">
                  当前已加入 {(pendingJoin.joined_users || []).length}/{pendingJoin.max_people}
                </div>
              </div>
              <button
                onClick={() => { setShowJoinConfirm(false); setPendingJoin(null); }}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-black"
              >
                ✕
              </button>
            </div>

            {pendingJoin.soul_question && pendingJoin.soul_question.trim().length > 0 && (
              <div className="mb-4 p-3 rounded-2xl bg-blue-50 border border-blue-100 flex gap-2 items-start">
                <Megaphone size={16} className="text-blue-500 mt-0.5" />
                <div>
                  <div className="text-[11px] font-black text-blue-600">灵魂一问</div>
                  <div className="text-sm font-bold text-gray-700 whitespace-pre-wrap">
                    {pendingJoin.soul_question}
                  </div>
                </div>
              </div>
            )}

            {/* 门槛标签 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(() => {
                const r = pendingJoin.requirements;
                const tags: string[] = [];

                if (pendingJoin.requires_verification) tags.push("仅限认证");

                if (r) {
                  if (r.gender === "female_only") tags.push("仅女生");
                  else if (r.gender === "male_only") tags.push("仅男生");
                  else tags.push("性别不限");

                  if (r.identity === "undergrad") tags.push("本科");
                  else if (r.identity === "graduate") tags.push("研究生");
                  else tags.push("身份不限");

                  if (r.stranger === "new_friends") tags.push("想认识新朋友");
                  else if (r.stranger === "has_circle") tags.push("有熟人也欢迎");
                  else tags.push("陌生人OK");

                  const vibeMap: Record<string, string> = {
                    quiet: "偏安静",
                    lively: "偏热闹",
                    casual: "轻松随意",
                    serious: "比较认真",
                    i_friendly: "I人友好",
                    e_friendly: "E人友好",
                  };
                  (r.vibe || []).slice(0, 3).forEach(k => tags.push(vibeMap[k] || k));

                  const hostMap: Record<string, string> = {
                    welcome_first_timer: "欢迎新手",
                    welcome_solo: "欢迎一个人来",
                    chat_before_decide: "可先聊再决定",
                    will_reply: "会在局内回复",
                    no_gender_mind: "不介意性别/专业",
                  };
                  (r.host_flags || []).slice(0, 2).forEach(k => tags.push(hostMap[k] || k));
                }

                return tags.slice(0, 10).map(t => (
                  <span key={t} className="text-[10px] font-black px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {t}
                  </span>
                ));
              })()}
            </div>

            <div className="text-xs font-bold text-gray-500 leading-relaxed mb-5">
              确认你符合门槛并愿意加入。加入后你就能看到其他同伴啦～
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowJoinConfirm(false); setPendingJoin(null); }}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-gray-100 text-gray-700 active:scale-95"
              >
                返回
              </button>
              <button
                onClick={confirmJoin}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-black text-white active:scale-95 disabled:opacity-60"
              >
                {isLoading ? "加入中..." : "确认加入"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发布活动弹窗（Airy Themed Canvas） */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-2xl flex items-center justify-center overflow-hidden"
          >
            <div
              className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000"
              style={{ backgroundColor: theme.glowPrimary }}
            />
            <div
              className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none transition-colors duration-1000"
              style={{ backgroundColor: theme.glowSecondary }}
            />

            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-[1200px] h-full sm:h-auto sm:max-h-[90vh] flex flex-col sm:rounded-[3rem] overflow-y-auto no-scrollbar px-6 sm:px-10 py-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-xs text-slate-400 font-black tracking-widest uppercase">Create Activity</div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900">发布活动</div>
                </div>
                <button
                  onClick={() => { resetCreateDraft(); setShowCreateModal(false); }}
                  className="w-11 h-11 rounded-full bg-white/70 border border-white flex items-center justify-center text-slate-500 font-black shadow-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateActivity} className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-4">
                {/* 左侧：输入与选项 */}
                <div className="col-span-1 lg:col-span-7 space-y-12">
                  <div className="space-y-4 relative">
                    <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase">T / 为你的房间命名</div>
                    <input
                      type="text"
                      value={activityDraft.title}
                      onChange={(e) => setActivityDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="输入一个让人想来的标题"
                      className="w-full text-4xl sm:text-5xl lg:text-[54px] font-light text-slate-800 bg-transparent border-b border-transparent focus:border-slate-200 outline-none pb-4 transition-colors"
                    />
                    <div className="pt-2">
                      <div className="flex items-center gap-2 bg-white/50 border border-white focus-within:border-slate-200 focus-within:bg-white rounded-2xl px-4 py-3 shadow-sm transition-all">
                        <span className="text-xl">✨</span>
                        <input
                          type="text"
                          value={soulQuestion}
                          onChange={(e) => setSoulQuestion(e.target.value.slice(0, 40))}
                          placeholder="灵魂一问（选填）"
                          className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-600"
                        />
                        <span className="text-[10px] font-black text-slate-300">{soulQuestion.length}/40</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase">类别</div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setActiveCategory(c)}
                          className={`px-4 py-2 rounded-full text-sm font-black border transition-all ${activeCategory === c ? `${theme.primary} text-white border-transparent` : "bg-white/60 text-slate-600 border-white"}`}
                        >
                          {CATEGORY_LABELS[c]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase">时间与人数</div>
                    <div className="flex flex-wrap gap-2">
                      {timeChips.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setActiveTime(t)}
                          className={`px-4 py-2 rounded-full text-sm font-black border transition-all ${activeTime === t ? `${theme.primary} text-white border-transparent` : "bg-white/60 text-slate-600 border-white"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="最少人数"
                        value={activityDraft.min_people}
                        onChange={(e) => setActivityDraft((p) => ({ ...p, min_people: e.target.value }))}
                        className="bg-white/70 rounded-2xl px-4 py-3 font-bold text-sm outline-none border border-white"
                      />
                      <input
                        type="number"
                        placeholder="最多人数"
                        value={activityDraft.max_people}
                        onChange={(e) => setActivityDraft((p) => ({ ...p, max_people: e.target.value }))}
                        className="bg-white/70 rounded-2xl px-4 py-3 font-bold text-sm outline-none border border-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase">详情与标签</div>
                    <textarea
                      value={activityDraft.description}
                      onChange={(e) => setActivityDraft((p) => ({ ...p, description: e.target.value }))}
                      placeholder="描述一下你想组织什么，越真诚越容易匹配到同频的人。"
                      className="w-full bg-white/60 rounded-2xl p-4 h-28 resize-none outline-none font-medium text-sm border border-white"
                    />
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                        className="flex-1 bg-white/60 rounded-2xl p-4 font-bold outline-none border border-white"
                        placeholder="输入标签，回车添加（最多6个）"
                      />
                      <button type="button" onClick={() => addTag(tagInput)} className="px-4 rounded-2xl bg-black text-white font-bold">
                        添加
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <span key={t} className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-black text-sm flex items-center gap-2">
                          #{t}
                          <button type="button" onClick={() => removeTag(t)} className="opacity-70 hover:opacity-100">×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-[11px] font-black tracking-widest text-slate-400 uppercase ml-2 hover:text-slate-600 transition-colors"
                  >
                    <svg className={`w-3 h-3 transition-transform duration-300 ${showAdvanced ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                    设置加入门槛 (选填)
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 bg-white/40 rounded-2xl border border-white/60 backdrop-blur-sm space-y-5 mt-2 shadow-sm">
                          <div className="space-y-2">
                            <div className="text-xs font-black text-slate-500">性别限制</div>
                            <div className="flex flex-wrap gap-2">
                              {["不限", "仅女生", "仅男生"].map((g) => (
                                <button key={g} type="button" onClick={() => setGenderLimit(g)} className={`px-3 py-1.5 rounded-full text-xs font-black border ${genderLimit === g ? "bg-black text-white border-transparent" : "bg-white text-slate-600 border-slate-200"}`}>
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-black text-slate-500">学历限制</div>
                            <div className="flex flex-wrap gap-2">
                              {["不限", "本科", "研究生", "博士"].map((i) => (
                                <button key={i} type="button" onClick={() => setIdentityLimit(i)} className={`px-3 py-1.5 rounded-full text-xs font-black border ${identityLimit === i ? "bg-black text-white border-transparent" : "bg-white text-slate-600 border-slate-200"}`}>
                                  {i}
                                </button>
                              ))}
                            </div>
                          </div>
                          <label className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-white">
                            <span className="text-sm font-black text-slate-700">仅限认证校友</span>
                            <input type="checkbox" checked={isVerifiedOnly} onChange={(e) => setIsVerifiedOnly(e.target.checked)} />
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { resetCreateDraft(); setShowCreateModal(false); }} className="px-6 h-12 rounded-2xl bg-slate-200 text-slate-600 font-black">
                      取消
                    </button>
                    <button type="submit" disabled={isLoading} className={`flex-1 h-12 rounded-2xl font-black text-white ${theme.primary} disabled:opacity-60`}>
                      {isLoading ? "发布中..." : "发布活动"}
                    </button>
                  </div>
                </div>

                {/* 右侧：校区场景选择 */}
                <div className="col-span-1 lg:col-span-5 space-y-4 lg:pl-10 lg:border-l lg:border-slate-200/50">
                  <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-6">校区场景</div>
                  <div className="grid grid-cols-2 gap-4 lg:gap-6">
                    {scenes.map((scene) => {
                      const isActive = activeScene === scene.id;
                      return (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => {
                            setActiveScene(scene.id);
                            setActivityDraft((p) => ({ ...p, location: scene.id }));
                          }}
                          className={`relative aspect-[4/3] rounded-[2rem] p-5 flex flex-col justify-end overflow-hidden transition-all duration-300 active:scale-[0.98] ${isActive ? `bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-[1.5px] ${theme.primaryBorder}` : "bg-white/50 backdrop-blur-sm border-[1.5px] border-transparent hover:bg-white/80"}`}
                        >
                          <div className={`absolute inset-0 flex items-center justify-center pb-6 transition-transform duration-500 ${isActive ? "scale-105" : "scale-100"}`}>
                            <div className={`w-20 h-20 lg:w-28 lg:h-28 transition-colors duration-300 ${isActive ? theme.primaryText : "text-slate-300"}`}>
                              {scene.svg}
                            </div>
                          </div>
                          <div className={`relative z-10 text-left text-[13px] font-black tracking-wider transition-colors ${isActive ? "text-slate-900" : "text-slate-400"}`}>{scene.id}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {roomOpen && roomActivity && (
        <RoomModal activity={roomActivity} currentUser={currentUser} onClose={closeRoom} onJump={handleSquareJump} highlightMsgId={targetMsgId} theme={theme} />
      )}

      {posterTarget && <PosterModal activity={posterTarget} onClose={() => setPosterTarget(null)} />}

      {showNotifyModal && (
        <div className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowNotifyModal(false)}>
          <div className="bg-white w-full rounded-t-[2rem] p-6 max-h-[70vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-black text-xl">消息通知</h3>
               <button onClick={() => {
                  setShowNotifyModal(false);
                  cloud.invoke("user-ops", { type: 'clear-notifies', username: currentUser });
                  setNotifications([]);
               }} className="text-xs font-bold text-gray-400">全部已读</button>
             </div>
             
             {notifications.length === 0 ? (
               <div className="text-center py-10 text-gray-300 font-bold">暂无新消息</div>
             ) : (
               <div className="space-y-4">
                 {notifications.map((n) => (
                   <div key={n._id || n.id || Math.random()} className="flex gap-3 items-start border-b border-gray-50 pb-3">
                     <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                       {n.from_user?.[0] || "@"}
                     </div>
                     <div className="flex-1">
                       <div className="text-sm font-bold">
                       <span className="text-black">{n.from_user || "有人"}</span> 
                       <span className="text-gray-400 mx-1">在活动里提到了你</span>
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1 line-clamp-2">
                        "{n.text || '...'}"
                      </div>
                     <div className="text-xs text-gray-400 mt-1">
                         {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                      </div>
                     </div>
                     <button onClick={async () => {
                        setShowNotifyModal(false);
                        setNotifications(prev => prev.filter(item => item._id !== n._id));
                        cloud.invoke("user-ops", { type: 'mark-notify-read', username: currentUser, notifyId: n._id });
                        if (n.activity_id) handleSquareJump(n.activity_id, n.msg_id);
                     }} className="px-3 py-1 bg-black text-white text-xs font-bold rounded-lg">
                       查看
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      )}

    </div>
  );
}

function RoomModal({
  activity,
  currentUser,
  onClose,
  onJump,
  highlightMsgId,
  theme,
}: {
  activity: Activity;
  currentUser: string;
  onClose: () => void;
  onJump?: (id: string, msgId?: string) => void;
  highlightMsgId?: string;
  theme: ThemePalette;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileUser, setProfileUser] = useState<UserData | null>(null);
  const [memberInfoMap, setMemberInfoMap] = useState<Record<string, UserData | null>>({});
  const [memberLoading, setMemberLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatText, setChatText] = useState("");
  const [lastTs, setLastTs] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const isPollingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGlobalSquare = activity._id === "global-square";
  const joined = activity.joined_users || [];
  const host = activity.author || "房主";
  const title = activity.title || "未命名活动";
  const canChat =
    isGlobalSquare ||
    (!!activity &&
      !!currentUser &&
      (activity.author === currentUser || joined.includes(currentUser)));

  const squareSkins: Record<
    ThemeKey,
    {
      root: string;
      header: string;
      iconWrap: string;
      title: string;
      sub: string;
      close: string;
      tip: string;
      avatar: string;
      shareCard: string;
      shareTag: string;
      shareBtn: string;
      myBubble: string;
      otherBubble: string;
      inputWrap: string;
      imageBtn: string;
      textarea: string;
      sendBtn: string;
    }
  > = {
    fairy: {
      root: "bg-gradient-to-b from-[#EAF7FF] via-[#F2E3C6] to-white text-slate-900",
      header: "bg-white/80 border-[#0095D9]/20",
      iconWrap: "bg-gradient-to-tr from-[#0095D9] to-[#4EC8FF] border-[#0095D9]/30",
      title: "text-slate-900",
      sub: "text-[#0095D9]",
      close: "bg-white/70 border-[#0095D9]/20 text-[#0095D9] hover:bg-white",
      tip: "bg-white/70 border-[#0095D9]/20 text-[#0095D9]",
      avatar: "bg-white/90 border-[#0095D9]/20 text-[#0095D9]",
      shareCard: "bg-white/90 border-[#0095D9]/20 text-slate-900",
      shareTag: "bg-[#0095D9]/10 text-[#0095D9]",
      shareBtn: "bg-gradient-to-r from-[#0095D9] to-[#FF4C00] text-white",
      myBubble: "bg-gradient-to-r from-[#0095D9] to-[#FF4C00] border-transparent text-white rounded-tr-none",
      otherBubble: "bg-white/90 text-slate-900 border-[#0095D9]/20 rounded-tl-none",
      inputWrap: "bg-white/85 border-[#0095D9]/20",
      imageBtn: "bg-white/80 border-[#0095D9]/20 text-[#0095D9]",
      textarea: "bg-white/80 border-[#0095D9]/20 text-slate-800 placeholder-slate-400",
      sendBtn: "bg-gradient-to-r from-[#0095D9] to-[#FF4C00] text-white shadow-[#0095D9]/20",
    },
    forest: {
      root: "bg-gradient-to-b from-[#ECF8EA] via-[#FCF5E2] to-white text-slate-900",
      header: "bg-white/85 border-[#0C8918]/20",
      iconWrap: "bg-gradient-to-tr from-[#0C8918] to-[#4DBA55] border-[#0C8918]/30",
      title: "text-slate-900",
      sub: "text-[#0C8918]",
      close: "bg-white/70 border-[#0C8918]/20 text-[#0C8918] hover:bg-white",
      tip: "bg-white/75 border-[#0C8918]/20 text-[#0C8918]",
      avatar: "bg-white/90 border-[#0C8918]/20 text-[#0C8918]",
      shareCard: "bg-white/90 border-[#0C8918]/20 text-slate-900",
      shareTag: "bg-[#0C8918]/10 text-[#0C8918]",
      shareBtn: "bg-gradient-to-r from-[#0C8918] to-[#FCC96E] text-[#103014]",
      myBubble: "bg-gradient-to-r from-[#0C8918] to-[#7BBE4A] border-transparent text-white rounded-tr-none",
      otherBubble: "bg-white/90 text-slate-900 border-[#0C8918]/20 rounded-tl-none",
      inputWrap: "bg-white/85 border-[#0C8918]/20",
      imageBtn: "bg-white/80 border-[#0C8918]/20 text-[#0C8918]",
      textarea: "bg-white/80 border-[#0C8918]/20 text-slate-800 placeholder-slate-400",
      sendBtn: "bg-gradient-to-r from-[#0C8918] to-[#FCC96E] text-[#103014] shadow-[#0C8918]/20",
    },
    british: {
      root: "bg-gradient-to-b from-[#120D0C] via-[#1A1311] to-[#0F0B0A] text-[#F2E3C6]",
      header: "bg-[#221815]/85 border-[#C18F4E]/25",
      iconWrap: "bg-gradient-to-tr from-[#4A010A] to-[#7A1120] border-[#C18F4E]/35",
      title: "text-[#F2E3C6]",
      sub: "text-[#C18F4E]",
      close: "bg-[#2A1F1B]/80 border-[#C18F4E]/25 text-[#C18F4E] hover:bg-[#312520]",
      tip: "bg-[#2A1F1B]/80 border-[#C18F4E]/25 text-[#C18F4E]",
      avatar: "bg-[#312520] border-[#C18F4E]/25 text-[#C18F4E]",
      shareCard: "bg-[#312520]/95 border-[#C18F4E]/25 text-[#F2E3C6]",
      shareTag: "bg-[#C18F4E]/20 text-[#F7D8A3]",
      shareBtn: "bg-gradient-to-r from-[#4A010A] to-[#C18F4E] text-[#F2E3C6]",
      myBubble: "bg-gradient-to-r from-[#4A010A] to-[#7A1120] border-transparent text-[#F2E3C6] rounded-tr-none",
      otherBubble: "bg-[#312520]/95 text-[#F2E3C6] border-[#C18F4E]/25 rounded-tl-none",
      inputWrap: "bg-[#1B1412]/95 border-[#C18F4E]/20",
      imageBtn: "bg-[#2A1F1B]/80 border-[#C18F4E]/25 text-[#C18F4E]",
      textarea: "bg-[#2A1F1B]/80 border-[#C18F4E]/20 text-[#F2E3C6] placeholder-[#C8B598]/45",
      sendBtn: "bg-gradient-to-r from-[#4A010A] to-[#C18F4E] text-[#F2E3C6] shadow-[#4A010A]/30",
    },
  };
  const squareSkin = squareSkins[theme.id as ThemeKey] ?? squareSkins.fairy;

  const roomSkin = {
    fairy: {
      panelBg: "bg-[#EAF4FF]",
      closeBtn: "bg-white/80 border-white/60 text-gray-500",
      shareBtn: "bg-[#FF4C00]/12 border-[#FF4C00]/35 text-[#FF4C00]",
      headerCard: "bg-gradient-to-r from-[#0095D9] to-[#4EC8FF] text-white border-white/20",
      seatBg: "bg-gradient-to-b from-[#EAF7FF] via-[#F2E3C6]/45 to-white",
      avatarOther: "bg-gradient-to-tr from-[#E6F4FF] to-[#F4FBFF] text-[#0095D9] shadow-md shadow-[#0095D9]/15",
      enterBtn: "bg-[#0095D9] text-white",
    },
    forest: {
      panelBg: "bg-[#F3FAED]",
      closeBtn: "bg-white/80 border-white/60 text-gray-600",
      shareBtn: "bg-[#0C8918]/12 border-[#0C8918]/35 text-[#0C8918]",
      headerCard: "bg-gradient-to-r from-[#0C8918] to-[#58B861] text-white border-white/20",
      seatBg: "bg-gradient-to-b from-[#ECF8EA] via-[#FCF5E2]/65 to-white",
      avatarOther: "bg-gradient-to-tr from-[#E8F7EA] to-[#F6FCF6] text-[#0C8918] shadow-md shadow-[#0C8918]/15",
      enterBtn: "bg-[#0C8918] text-white",
    },
    british: {
      panelBg: "bg-[#171210]",
      closeBtn: "bg-[#2A1F1B]/80 border-[#C18F4E]/20 text-[#C18F4E]",
      shareBtn: "bg-[#C18F4E]/12 border-[#C18F4E]/35 text-[#C18F4E]",
      headerCard: "bg-gradient-to-r from-[#4A010A] to-[#7A1120] text-[#F2E3C6] border-[#C18F4E]/25",
      seatBg: "bg-gradient-to-b from-[#1C1513] via-[#241A17] to-[#2E221D]",
      avatarOther: "bg-gradient-to-tr from-[#3A2B26] to-[#2C211D] text-[#C18F4E] shadow-md shadow-black/35",
      enterBtn: "bg-[#C18F4E] text-[#3A2016]",
    },
  }[theme.id as ThemeKey];

  const SEAT_COUNT = 8;
  const seatedUsers = (() => {
    const list: string[] = [];
    const pushUniq = (u: string) => { if (u && !list.includes(u)) list.push(u); };
    pushUniq(activity.author);
    (activity.joined_users || []).filter(u => u !== activity.author).forEach(pushUniq);
    return list.slice(0, SEAT_COUNT);
  })();
  const seats: (string | null)[] = Array.from({ length: SEAT_COUNT }, (_, i) => seatedUsers[i] || null);

  useEffect(() => {
    setMessages([]);
    setLastTs(0);
  }, [activity._id]);

  // 加载成员信息（普通房间）
  useEffect(() => {
    if (isGlobalSquare) return;
    const joined = activity.joined_users || [];
    if (!joined.length) return;
    let cancelled = false;
    (async () => {
      setMemberLoading(true);
      try {
        const need = joined.filter(u => !memberInfoMap[u]);
        if (!need.length) return;
        const results = await Promise.all(
          need.map(async (u) => {
            try {
              const res = await cloud.invoke("user-ops", { type: "get-info", username: u });
              return [u, res || null] as const;
            } catch {
              return [u, null] as const;
            }
          })
        );
        if (cancelled) return;
        setMemberInfoMap(prev => {
          const next = { ...prev };
          for (const [u, data] of results) next[u] = data;
          return next;
        });
      } finally {
        if (!cancelled) setMemberLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity._id, isGlobalSquare]);

  // 消息轮询
  useEffect(() => {
    if (!activity?._id || !currentUser) return;
    const fetchNewMessages = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const res = await cloud.invoke("get-messages", {
          activityId: activity._id,
          username: currentUser,
          since: lastTs,
          limit: 100,
        });
        if (res?.ok && Array.isArray(res.data) && res.data.length > 0) {
          const newMsgs = res.data;
          setMessages((prev) => {
            const existingIds = new Set(prev.map(m => m._id));
            const validNew = newMsgs.filter((m: ChatMsg) => !existingIds.has(m._id));
            if (validNew.length === 0) return prev;
            return [...prev, ...validNew].sort((a, b) => a.created_at - b.created_at);
          });
          const newest = newMsgs[newMsgs.length - 1].created_at;
          if (newest > lastTs) setLastTs(newest);
        }
      } catch (e) {
        console.error("Polling error", e);
      } finally {
        isPollingRef.current = false;
      }
    };
    fetchNewMessages();
    timerRef.current = setInterval(fetchNewMessages, 2000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activity?._id, currentUser, lastTs]);

  useEffect(() => {
    if (!(isGlobalSquare || showChat)) return;
    const highlightId = highlightMsgId ? `msg-${highlightMsgId}` : "";
    if (highlightId) {
      const el = document.getElementById(highlightId);
      if (el) {
        el.classList.remove("animate-flash");
        // 强制 reflow 以便重新触发动画
        void el.offsetWidth;
        el.classList.add("animate-flash");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    if (msgEndRef.current) {
      msgEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChat, isGlobalSquare, highlightMsgId]);

  const handleAvatarClick = (targetUser: string) => {
    if (targetUser === currentUser) {
      openUserProfile(targetUser);
      return;
    }
    const mention = `@${targetUser} `;
    setChatText(prev => prev + mention);
  };

  const openUserProfile = async (username: string) => {
    setProfileOpen(true);
    setProfileLoading(true);
    setProfileUser(null);
    try {
      const res = await cloud.invoke("user-ops", { type: "get-info", username });
      if (res) setProfileUser(res);
    } catch {
      alert("获取档案失败（网络错误）");
    } finally {
      setProfileLoading(false);
    }
  };

  const sendChat = async () => {
    const text = chatText.trim();
    if (!text) return;
    setChatText("");
    setChatLoading(true);
    try {
      const res = await cloud.invoke("send-message", {
        activityId: activity._id,
        username: currentUser,
        text,
      });
      if (!res?.ok) {
        alert(res?.msg || "发送失败");
        setChatText(text);
      }
    } catch {
      alert("网络错误");
      setChatText(text);
    } finally {
      setChatLoading(false);
    }
  };

  const handleShareToSquare = async () => {
    if (!window.confirm("要把这个活动转发到【新春聊天大集市】吗？")) return;
    try {
      await cloud.invoke("send-message", {
        activityId: "global-square",
        username: currentUser,
        msgType: "share_activity",
        text: `[活动召集] ${activity.title}`,
        payload: {
          id: activity._id,
          title: activity.title,
          time: activity.time,
          location: activity.location,
        },
      });
      alert("🎉 已成功转发到大广场！");
    } catch {
      alert("发送失败");
    }
  };

  const handleSelectImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("图片太大了，请上传 2MB 以内的图片");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Str = evt.target?.result as string;
      if (!base64Str) return;
      setChatLoading(true);
      try {
        const res = await cloud.invoke("send-message", {
          activityId: activity._id,
          username: currentUser,
          msgType: "image",
          text: base64Str,
        });
        if (!res?.ok) {
          alert(res?.msg || "图片发送失败");
        }
      } catch {
        alert("网络错误");
      } finally {
        setChatLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  // ==================================================================================
  // 🔥 场景 A: 全服聊天大广场 (Full Screen Mode) -> 🏮 新春特别版
  // ==================================================================================
  if (isGlobalSquare) {
    return (
      <div className={`fixed inset-0 z-[999] flex flex-col animate-fade-in font-sans ${squareSkin.root}`}>
        <div className={`backdrop-blur-md px-4 py-3 shadow-lg border-b flex items-center justify-between sticky top-0 z-10 ${squareSkin.header}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl shadow-md border ${squareSkin.iconWrap}`}>
              🌍
            </div>
            <div>
              <div className={`font-black text-base ${squareSkin.title}`}>聊天大广场</div>
              <div className={`text-[10px] font-bold flex items-center gap-1 ${squareSkin.sub}`}>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                全服热聊中 · 消息保留24h
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-9 h-9 border rounded-full flex items-center justify-center font-bold active:scale-90 transition-transform ${squareSkin.close}`}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center py-4">
            <span className={`text-[10px] border px-4 py-1.5 rounded-full font-bold ${squareSkin.tip}`}>
              请文明发言，共创和谐氛围
            </span>
          </div>

          {messages.map((m, i) => {
            const mine = m.sender === currentUser;
            const highlight = !!highlightMsgId && m._id === highlightMsgId;

            if (m.msgType === "share_activity" && isSharedActivityPayload(m.payload)) {
              const act = m.payload;
              return (
                <div
                  key={i}
                  id={m._id ? `msg-${m._id}` : undefined}
                  className={`flex ${mine ? "justify-end" : "justify-start"} transition-colors duration-500 rounded-2xl ${highlight ? "animate-flash" : ""}`}
                >
                  {!mine && (
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black mr-2 mt-1 shrink-0 cursor-pointer ${squareSkin.avatar}`}
                      onClick={() => handleAvatarClick(m.sender)}
                    >
                      {m.sender[0]}
                    </div>
                  )}
                  <div className={`p-3 rounded-2xl shadow-md border max-w-[260px] ${squareSkin.shareCard}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${squareSkin.shareTag}`}>活动召集</span>
                      <span className="text-[10px] font-bold text-gray-500">by {m.sender}</span>
                    </div>
                    <div className="font-black text-sm mb-1">{act.title}</div>
                    <div className="text-xs text-gray-600 font-bold mb-3 leading-relaxed">
                      📅 {act.time}
                      <br />
                      📍 {act.location}
                    </div>
                    <button
                      onClick={() => onJump?.(act.id)}
                      className={`w-full py-2 text-xs font-black rounded-xl active:opacity-90 shadow-sm ${squareSkin.shareBtn}`}
                    >
                      立即查看 / 加入 🚀
                    </button>
                  </div>
                </div>
              );
            }

            if (m.msgType === "image") {
              return (
                <div
                  key={`${m.sender}_${m.created_at}_${i}`}
                  id={m._id ? `msg-${m._id}` : undefined}
                  className={`flex ${mine ? "justify-end" : "justify-start"} transition-colors duration-500 rounded-2xl ${highlight ? "animate-flash" : ""}`}
                >
                  {!mine && (
                    <div
                      className={`w-8 h-8 rounded-full border shadow-sm flex items-center justify-center text-xs font-black mr-2 mt-1 shrink-0 cursor-pointer ${squareSkin.avatar}`}
                      onClick={() => handleAvatarClick(m.sender)}
                    >
                      {m.sender[0]}
                    </div>
                  )}
                  <div className={mine ? "ml-2" : "mr-2"}>
                    {!mine && <div className="text-[10px] font-bold text-red-900/50 mb-0.5">{m.sender}</div>}
                    <img
                      src={m.text}
                      alt="图片"
                      className="max-w-[200px] max-h-[300px] rounded-2xl border-2 border-white/20 shadow-md object-cover bg-black/20"
                      onClick={() => window.open(m.text)}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${m.sender}_${m.created_at}_${i}`}
                id={m._id ? `msg-${m._id}` : undefined}
                className={`flex ${mine ? "justify-end" : "justify-start"} transition-colors duration-500 rounded-2xl ${highlight ? "animate-flash" : ""}`}
              >
                {!mine && (
                  <div
                    onClick={() => handleAvatarClick(m.sender)}
                    className={`w-8 h-8 rounded-full border shadow-sm flex items-center justify-center text-xs font-black mr-2 mt-1 shrink-0 cursor-pointer ${squareSkin.avatar}`}
                  >
                    {m.sender[0]}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm border ${
                    mine
                      ? squareSkin.myBubble
                      : squareSkin.otherBubble
                  }`}
                >
                  {!mine && <div className="text-[10px] font-bold text-gray-500 mb-0.5">{m.sender}</div>}
                  <div className="text-[14px] font-medium leading-relaxed break-words whitespace-pre-wrap">
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={msgEndRef} className="h-4" />
        </div>

        <div className={`px-4 py-3 border-t pb-safe relative z-20 ${squareSkin.inputWrap}`}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleSelectImage}
          />
          <div className="flex gap-2 items-end">
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center active:scale-95 ${squareSkin.imageBtn}`}
            >
              <ImageIcon size={20} />
            </button>
            <textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="说点什么..."
              rows={1}
              className={`flex-1 border rounded-2xl px-4 py-3 font-bold text-sm outline-none resize-none min-h-[44px] max-h-[120px] transition-colors ${squareSkin.textarea}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
            />
            <button
              type="button"
              onClick={sendChat}
              disabled={chatLoading || !chatText.trim()}
              className={`w-12 h-11 rounded-2xl flex items-center justify-center disabled:opacity-50 disabled:grayscale active:scale-95 transition-all shadow-md ${squareSkin.sendBtn}`}
            >
              <SendIcon />
            </button>
          </div>
        </div>

        {profileOpen && (
          <div
            className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-end justify-center"
            onClick={() => setProfileOpen(false)}
          >
            <div
              className="w-full bg-[#FFFBF0] rounded-t-[2rem] p-6 animate-slide-up text-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-black text-red-950">@{profileUser?.username || "..."}</h3>
                <button onClick={() => setProfileOpen(false)} className="p-2 bg-red-50 text-red-800 rounded-full">
                  ✕
                </button>
              </div>
              {profileLoading ? (
                <p className="text-sm font-bold text-red-300">加载中...</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-red-900/80 font-bold">{profileUser?.profile?.intro || "暂无介绍"}</p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                      {profileUser?.profile?.grade || "未知年级"}
                    </span>
                    <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold">
                      {profileUser?.profile?.mbti || "未知MBTI"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-red-100/60">
                    <div className="text-[10px] font-bold text-red-700/70 uppercase mb-1">联系方式</div>
                    <div className="flex items-center justify-between bg-white text-red-900 p-3 rounded-xl border border-red-100 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💬</span>
                        <div>
                          <div className="text-[10px] text-red-700 font-bold">WeChat ID</div>
                          <div className="text-sm font-black select-text">
                            {profileUser?.profile?.wechat_id || "未填写"}
                          </div>
                        </div>
                      </div>
                      {profileUser?.profile?.wechat_id && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(profileUser.profile?.wechat_id || "");
                            alert("已复制微信号！");
                          }}
                          className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg shadow-sm active:scale-95"
                        >
                          复制
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 普通房间
  return (
    <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className={`absolute inset-x-0 top-0 bottom-0 flex flex-col sm:max-w-md sm:mx-auto animate-slide-up ${roomSkin.panelBg}`}>
        <div className="flex items-center justify-between px-4 pt-4">
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-full border flex items-center justify-center font-black active:scale-95 ${roomSkin.closeBtn}`}
          >
            ✕
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareToSquare}
              className={`h-8 px-3 rounded-full border text-[10px] font-black flex items-center gap-1 active:scale-95 ${roomSkin.shareBtn}`}
            >
              <Share2 size={12} /> 转发到广场
            </button>
            <div className="text-xs font-black text-gray-500 bg-white/70 px-3 py-2 rounded-full border border-white/60">
              {joined.length}/{activity.max_people}
            </div>
          </div>
        </div>

        <div className="px-4 mt-3 mb-4">
          <div className={`rounded-3xl px-5 py-4 shadow-lg border relative overflow-hidden ${roomSkin.headerCard}`}>
            <div className="text-[11px] font-black opacity-90">房主：{host}</div>
            <div className="text-2xl font-black mt-1 leading-tight">{title}</div>
            <div className="text-[12px] font-bold opacity-90 mt-1 line-clamp-2">{activity.description || "暂无描述"}</div>
          </div>
        </div>

        <div className={`relative flex-1 px-4 overflow-y-auto pb-24 rounded-t-3xl ${roomSkin.seatBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-black text-gray-700">房间座位 ({seatedUsers.length}/{SEAT_COUNT})</div>
            {memberLoading && (
              <div className="text-[10px] font-bold text-gray-400 animate-pulse">
                正在同步档案...
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-5 sm:gap-8">
            {seats.map((u, idx) => {
              const empty = !u;
              const info = u ? (memberInfoMap[u] || null) : null;
              const isMe = u === currentUser;
              const floatClass = idx % 2 === 0 ? "animate-float" : "animate-float-delayed";
              return (
                <div
                  key={idx}
                  className="animate-seat-in"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <button
                    disabled={empty}
                    onClick={() => { if (u) openUserProfile(u); }}
                    className={`glass-ripple relative w-full max-w-[180px] mx-auto aspect-square rounded-full transition-all duration-300 active:scale-[0.95] ${floatClass} ${
                      empty
                        ? "bg-white/10 border border-white/20 border-dashed backdrop-blur-sm hover:bg-white/20"
                        : "bg-gradient-to-br from-white/40 to-white/10 border border-white/50 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1"
                    } flex flex-col items-center justify-center p-3 text-center`}
                  >
                    <div className="text-[10px] font-black text-gray-400/50 mb-1">#{idx + 1}</div>
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm shadow-inner mb-2 ${
                      empty
                        ? "bg-white/20 text-gray-400/70"
                        : isMe
                          ? "bg-gradient-to-tr from-gray-800 to-black text-white shadow-lg shadow-black/20"
                          : roomSkin.avatarOther
                    }`}>
                      {u ? u[0].toUpperCase() : "+"}
                    </div>
                    <div className="min-w-0 flex flex-col items-center">
                      <div className={`font-black text-xs truncate w-24 ${empty ? "text-gray-400/60" : "text-gray-800"}`}>
                        {u || "空座"}
                      </div>
                      {!empty && (
                        <div className="text-[10px] text-gray-500/80 font-bold mt-0.5">
                          {info?.profile?.mbti || "MBTI"}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="fixed left-0 right-0 bottom-0 bg-white/85 backdrop-blur border-t border-white/60 px-4 py-3 flex gap-3 sm:max-w-md sm:mx-auto">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-black active:scale-95">
            返回
          </button>
          <button
            onClick={() => { if (canChat) setShowChat(true); }}
            disabled={!canChat}
            className={`flex-1 py-4 rounded-2xl font-black text-sm transition active:scale-95 ${canChat ? roomSkin.enterBtn : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}
          >
            {canChat ? "进入聊天" : "加入后可聊"}
          </button>
        </div>

        {showChat && (
          <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-end sm:max-w-md sm:mx-auto">
            <div className="w-full bg-white rounded-t-[2.5rem] p-5 shadow-2xl max-h-[85vh] h-[85vh] flex flex-col animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <div className="font-black text-lg">房间聊天</div>
                <button onClick={() => setShowChat(false)} className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-black">
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {messages.length === 0 && <div className="text-center text-gray-300 text-xs font-bold mt-10">暂无消息</div>}
                {messages.map((m, i) => {
                  const mine = m.sender === currentUser;
                  const highlight = !!highlightMsgId && m._id === highlightMsgId;

                  if (m.msgType === "share_activity" && isSharedActivityPayload(m.payload)) {
                    const act = m.payload;
                    return (
                      <div
                        key={i}
                        id={m._id ? `msg-${m._id}` : undefined}
                        className={`flex ${mine ? "justify-end" : "justify-start"} transition-colors duration-500 rounded-2xl ${highlight ? "animate-flash" : ""}`}
                      >
                        {!mine && <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black mr-2 mt-1">{m.sender[0]}</div>}
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-orange-100 max-w-[240px]">
                          <div className="font-black text-sm text-gray-900 mb-1">{act.title}</div>
                          <div className="text-xs text-gray-500 font-bold mb-2">📅 {act.time}</div>
                          <button className="px-3 py-1 bg-gray-100 text-xs font-bold rounded-lg w-full">活动卡片</button>
                        </div>
                      </div>
                    );
                  }

                  if (m.msgType === "image") {
                    return (
                      <div
                        key={i}
                        id={m._id ? `msg-${m._id}` : undefined}
                        className={`flex ${mine ? "justify-end" : "justify-start"} transition-colors duration-500 rounded-2xl ${highlight ? "animate-flash" : ""}`}
                      >
                        {!mine && (
                          <div
                            onClick={() => handleAvatarClick(m.sender)}
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black mr-2 mt-1 shrink-0 cursor-pointer"
                          >
                            {m.sender[0]}
                          </div>
                        )}
                        <div>
                          {!mine && <div className="text-[10px] text-gray-400 font-bold mb-1 ml-1">{m.sender}</div>}
                          <img
                            src={m.text}
                            alt="图片"
                            className="max-w-[180px] max-h-[240px] rounded-2xl border border-gray-200 shadow-sm object-cover bg-gray-50"
                            onClick={() => window.open(m.text)}
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={i}
                      id={m._id ? `msg-${m._id}` : undefined}
                      className={`flex ${mine ? "justify-end" : "justify-start"} transition-colors duration-500 rounded-2xl ${highlight ? "animate-flash" : ""}`}
                    >
                      {!mine && (
                        <div
                          onClick={() => handleAvatarClick(m.sender)}
                          className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black mr-2 mt-1 shrink-0 cursor-pointer"
                        >
                          {m.sender[0]}
                        </div>
                      )}
                      <div>
                        {!mine && <div className="text-[10px] text-gray-400 font-bold mb-1 ml-1">{m.sender}</div>}
                        <div className={`max-w-[260px] rounded-2xl px-4 py-2.5 text-sm font-bold leading-relaxed break-words whitespace-pre-wrap shadow-sm ${mine ? "bg-black text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"}`}>
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEndRef} />
              </div>
              <div className="pt-3 flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleSelectImage}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center active:scale-95"
                >
                  <ImageIcon size={20} />
                </button>
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  className="flex-1 bg-gray-50 rounded-2xl px-4 font-bold text-sm outline-none"
                  placeholder="说点什么..."
                />
                <button onClick={sendChat} className="px-5 py-3 rounded-2xl bg-black text-white font-black text-sm">
                  发送
                </button>
              </div>
            </div>
          </div>
        )}
        {profileOpen && (
          <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-end justify-center sm:max-w-md sm:mx-auto" onClick={() => setProfileOpen(false)}>
            <div className="w-full bg-white rounded-t-[2.5rem] p-6 pb-8 shadow-2xl border border-white/60" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-black">个人档案</div>
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 font-black active:scale-95"
                >
                  ✕
                </button>
              </div>

              {profileLoading && (
                <div className="bg-gray-50 rounded-2xl p-4 text-sm font-bold text-gray-500">
                  正在加载…
                </div>
              )}

              {!profileLoading && profileUser && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-black">{profileUser.username}</div>
                      {profileUser.is_verified ? (
                        <div className="px-2 py-1 rounded-lg bg-yellow-400 text-yellow-950 text-[10px] font-black">
                          已认证
                        </div>
                      ) : (
                        <div className="px-2 py-1 rounded-lg bg-gray-200 text-gray-600 text-[10px] font-black">
                          未认证
                        </div>
                      )}
                    </div>

                  <div className="mt-2 text-sm font-bold text-gray-500 whitespace-pre-wrap">
                    {profileUser.profile?.intro || "这个人还没写自我介绍…"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400">性别</div>
                    <div className="text-sm font-black mt-1">
                      {profileUser.profile?.gender || "未填写"}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400">年级</div>
                    <div className="text-sm font-black mt-1">
                      {profileUser.profile?.grade || "未填写"}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-gray-100 col-span-2">
                    <div className="text-[10px] font-black text-gray-400">来自城市</div>
                    <div className="text-sm font-black mt-1">
                      {profileUser.profile?.city || "未填写"}
                    </div>
                  </div>

                    <div className="bg-white rounded-2xl p-4 border border-gray-100 col-span-2">
                    <div className="text-[10px] font-black text-gray-400">兴趣爱好</div>
                    <div className="text-sm font-black mt-1">
                      {profileUser.profile?.hobbies || "未填写"}
                    </div>
                  </div>
                </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">联系方式</div>
                    <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl border border-green-100">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💬</span>
                        <div>
                          <div className="text-[10px] text-green-600 font-bold">WeChat ID</div>
                          <div className="text-sm font-black text-green-800 select-text">
                            {profileUser.profile?.wechat_id || "未填写"}
                          </div>
                        </div>
                      </div>
                      {profileUser?.profile?.wechat_id && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(profileUser.profile?.wechat_id || "");
                            alert("已复制微信号！");
                          }}
                          className="px-3 py-1.5 bg-white text-green-700 text-xs font-bold rounded-lg shadow-sm active:scale-95"
                        >
                          复制
                        </button>
                      )}
                    </div>
                  </div>

                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  className="w-full py-3 rounded-2xl bg-black text-white font-black active:scale-95"
                  >
                    返回房间
                  </button>
                </div>
              )}

              {!profileLoading && !profileUser && (
                <div className="bg-gray-50 rounded-2xl p-4 text-sm font-bold text-gray-500">
                  没拿到该用户档案（可能还没创建/网络问题）
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SendIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

export default App;
