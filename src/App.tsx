import code4teamQR from "./assets/code4team.jpg";
import groupQrImg from "./assets/team_code.jpg";
import adminQrImg from "./assets/person_code.jpg";
import { useState, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { Cloud, EnvironmentType } from "laf-client-sdk";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import { MapPin, Plus, Zap, User, Calendar, Search, Lock, Palette, Home, LayoutGrid, Eraser, Shield, ShieldAlert, ShieldCheck, Mail, Edit3, Save, Trophy, Star, Crown, Gift, Sparkles, QrCode, BadgeCheck, Megaphone, UserMinus, Users, Eye, Share2, Download, X, Copy, HeartHandshake, Code2, Coffee, ChevronRight, Image as ImageIcon } from "lucide-react";
import AnnouncementModal from "./components/AnnouncementModal";

// ⚠️ 前端白名单 (控制 Tab 显示)，需要与后端保持一致
const ADMIN_USERS = ["ding", "chen"];

// ===== New Year helpers =====

const NEW_YEAR_WISHES = [
  "把想做的事情写下来，新的一年都去试试。",
  "倒计时走起，跨年约上想见的人吧。",
  "愿你遇见同频的伙伴，也遇见闪光的自己。",
  "这一年辛苦了，来年的愿望我们一起实现。",
  "在倒计时里，给自己一个大胆的开始。",
];

const NEW_YEAR_TAGS = ["新年", "跨年", "倒计时"];

type NewYearCountdown = {
  targetYear: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function pickWish(seed: number) {
  const i = Math.abs(seed) % NEW_YEAR_WISHES.length;
  return NEW_YEAR_WISHES[i];
}

function calcNewYearCountdown(): NewYearCountdown {
  const now = new Date();
  const targetYear = now.getFullYear() + 1;
  const target = new Date(targetYear, 0, 1, 0, 0, 0);
  const diff = Math.max(0, target.getTime() - Date.now());
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;

  return {
    targetYear,
    days: Math.floor(diff / dayMs),
    hours: Math.floor((diff % dayMs) / hourMs),
    minutes: Math.floor((diff % hourMs) / minuteMs),
    seconds: Math.floor((diff % minuteMs) / 1000),
  };
}

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
  payload?: any;
}

type CategoryType = "美食搭子" | "学习搭子" | "运动健身" | "桌游搭子" | "逛街散步" | "游戏搭子" | "旅行搭子" | "文艺演出";

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
    identity: "any" | "undergrad" | "graduate";
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
  warm: { name: "暖阳橙", bg: "bg-[#FFF8F0]", card: "bg-white", primary: "bg-orange-500", primaryText: "text-orange-500", accent: "bg-yellow-400", icon: "text-orange-600", border: "border-orange-100", badge: "bg-orange-50 text-orange-600", navActive: "text-orange-600", navInactive: "text-gray-300" },
  cool: { name: "清凉蓝", bg: "bg-[#F0F8FF]", card: "bg-white", primary: "bg-blue-600", primaryText: "text-blue-600", accent: "bg-cyan-400", icon: "text-blue-600", border: "border-blue-100", badge: "bg-blue-50 text-blue-600", navActive: "text-blue-600", navInactive: "text-gray-300" },
  nju: { name: "南大紫", bg: "bg-[#F3E5F5]", card: "bg-white/90", primary: "bg-[#6A005F]", primaryText: "text-[#6A005F]", accent: "bg-purple-400", icon: "text-[#6A005F]", border: "border-purple-200", badge: "bg-purple-100 text-purple-800", navActive: "text-[#6A005F]", navInactive: "text-gray-400" }
};

type ThemeKey = keyof typeof THEMES;
const CATEGORY_OPTIONS: CategoryType[] = ["美食搭子", "学习搭子", "运动健身", "桌游搭子", "逛街散步", "游戏搭子", "旅行搭子", "文艺演出"];

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
  const loadList = async () => {
    setIsLoading(true);
    try {
      const res = await cloud.invoke("admin-ops", {
        type: "admin-list-activities",
        username: currentUser,
      });
      if (res.ok) setActivities(res.data);
      else alert(res.msg);
    } catch (e) {
      alert("加载失败");
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (e) {
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
    } catch (e) {
      alert("操作失败");
    }
  };

  useEffect(() => {
    loadList();
  }, []);

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
    } catch (e) {
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
  const [activeCategory, setActiveCategory] = useState<"全部" | CategoryType>("全部");
  const [tagFilter, setTagFilter] = useState<string>("");
  const categoryFilter = activeCategory;
  const setCategoryFilter = setActiveCategory;
  const [inputTimeStr, setInputTimeStr] = useState("");
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
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
  identity: "any" as "any" | "undergrad" | "graduate",
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
  const [notifications, setNotifications] = useState<any[]>([]);
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

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const handleDateChange = (key: keyof typeof dateState, val: string) => {
    const numVal = parseInt(val);
    setDateState(prev => {
      const next = { ...prev, [key]: numVal };
      if (key === 'year' || key === 'month') {
        const maxDays = getDaysInMonth(next.year, next.month);
        if (next.day > maxDays) next.day = maxDays;
      }
      return next;
    });
  };
  const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("warm");
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(true);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStep, setLoginStep] = useState<"inputName" | "nameTaken" | "inputPassword" | "createAccount">("inputName");
  const [loginError, setLoginError] = useState("");
  const [newYearMode, setNewYearMode] = useState(false);
  const [newYearOnly, setNewYearOnly] = useState(false);

  // ===== 新年专题状态 =====
  const [showNewYearWish, setShowNewYearWish] = useState(false);
  const [wishText, setWishText] = useState("");
  const [wishSeed, setWishSeed] = useState(0); // 用于“再来一个”刷新
  const [newYearCountdown, setNewYearCountdown] = useState<NewYearCountdown>(() => calcNewYearCountdown());

  // 打开新年祝福
  const openNewYearWish = () => {
    const seed = Date.now();
    setWishSeed(seed);
    setWishText(pickWish(seed));
    setShowNewYearWish(true);
  };

  const closeNewYearWish = () => {
    setShowNewYearWish(false);
  };

  const nextNewYearWish = () => {
    const seed = wishSeed + 1;
    setWishSeed(seed);
    setWishText(pickWish(seed));
  };

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

  const lastWasNewYearRef = useRef(false);
  const formatTwoDigits = (n: number) => n.toString().padStart(2, "0");


  // --- 隐藏成就：社群会员盲盒 ---
  const [showSecret, setShowSecret] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [secretBadge, setSecretBadge] = useState<string>(() => {
    if (!currentUser) return "";
    return localStorage.getItem(`club_secret_badge_${currentUser}`) || "";
  });
  const isFounder = secretBadge.includes("Founder");

  const theme = THEMES[currentTheme];
  const isNewYear = newYearMode;

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

  useEffect(() => {
    const timer = setInterval(() => setNewYearCountdown(calcNewYearCountdown()), 1000);
    return () => clearInterval(timer);
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
      const matchCategory = activeCategory === "全部" || a.category === activeCategory;
      const matchTag = !tagFilter || (a.tags || []).includes(tagFilter);
      const matchNewYear = !newYearOnly || (a.tags || []).some(t => NEW_YEAR_TAGS.includes(t));

      const isActive = (a.status || 'active') === 'active';
      const isHidden = (a.hidden_by || []).includes(currentUser);
      const expired = isExpired(a);

      return matchSearch && matchCategory && matchTag && matchNewYear && isActive && !expired && !isHidden;
    });
  }, [activities, searchTerm, activeCategory, currentUser, tagFilter, newYearOnly]);

  useEffect(() => {
    if (isNewYear && !lastWasNewYearRef.current && !showNewYearWish) {
      openNewYearWish();
    }
    lastWasNewYearRef.current = isNewYear;
  }, [isNewYear, showNewYearWish]);

  const handleSetTheme = (theme: ThemeKey) => {
    if (theme === "nju" && userActivityCount < 10) { 
      alert(`🔒 解锁 [南大紫] 需要累计参与 10 次活动。\n\n当前进度：${userActivityCount}/10\n\n加油，多发活动或多参与！`); 
      return; 
    }
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
    let t = (raw ?? "").trim().replace(/^#/, "");
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
    setCreateStep(1);
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

  const toggleInList = (key: "vibe" | "host_flags", v: string, limit: number) => {
    setReqDraft(prev => {
      const arr = prev[key];
      const has = arr.includes(v);
      if (has) return { ...prev, [key]: arr.filter(x => x !== v) };
      if (arr.length >= limit) return prev;
      return { ...prev, [key]: [...arr, v] };
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
    } catch (e) {
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
      category: "大厅" as any,
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
    } catch (e) { alert("网络错误"); } finally { setIsLoading(false); }
  };

  const handleCommonOp = async (opName: string, activityId: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke(opName, { activityId, username: currentUser });
      if (res.ok) { fetchActivities(); if(opName==='hide-activity') setActivities(prev=>prev.filter(a=>a._id!==activityId)); } 
      else alert(res.msg || "失败");
    } catch (e) { alert("网络错误"); } finally { setIsLoading(false); }
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
    } catch(e) { alert("发送失败"); } finally { setIsSendingCode(false); }
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
    } catch(e) { alert("验证失败"); }
  };

  const saveProfile = async () => {
    if (!requireStrongPwd()) return;
    try {
      const res = await cloud.invoke("user-ops", { type: 'update-profile', username: currentUser, profile: tempProfile });
      if (res.ok) { alert("档案已保存"); setUserData(prev => prev ? {...prev, profile: tempProfile} : null); setIsEditingProfile(false); }
    } catch(e) { alert("保存失败"); }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!requireStrongPwd()) return;

    const title = (activityDraft.title || "").trim();
    const location = (activityDraft.location || "").trim();
    const description = (activityDraft.description || "").trim();
    const category = activityDraft.category || "约饭";
    const { minVal, maxVal } = normalizePeople();
    const timeString = inputTimeStr.trim();
    const soulQuestion = (activityDraft.soul_question || "").trim();
    if (soulQuestion.length > 40) { alert("灵魂一问最多 40 字"); return; }

    // ✅ 前端兜底校验（避免请求后端才提示）
    if (!title) { alert("❌ 标题不能为空"); setCreateStep(1); return; }
    if (!location) { alert("❌ 地点不能为空"); setCreateStep(1); return; }
    if (!timeString) { alert("⏰ 请填写时间"); setCreateStep(1); return; }
    if (minVal < 2) { alert("❌ 至少 2 人"); setCreateStep(1); return; }
    if (maxVal < minVal) { alert("❌ 人数设置错误"); setCreateStep(1); return; }

    const isNewYearTopic = tags.some(t => NEW_YEAR_TAGS.includes(t));

    const newActivity = {
      title,
      description,
      category,
      max_people: maxVal,
      min_people: minVal,
      time: timeString,
      location,
      author: currentUser,
      requires_verification: !!activityDraft.requires_verification,
      requirements: reqDraft,
      soul_question: soulQuestion,
      tags,
      topic: isNewYearTopic ? "newyear" : "",
    };

    setIsLoading(true);
    try {
      console.log("[create] payload=", newActivity);
      const res: any = await cloud.invoke("create-activity", newActivity);
      console.log("[create] res=", res);

      if (res?.ok) {
        setShowCreateModal(false);
        resetCreateDraft();
        fetchActivities();
      } else {
        alert("发布失败：" + (res?.msg || "未知错误"));
      }
    } catch (e: any) {
      console.error(e);
      alert("发布失败（invoke 异常）：" + (e?.message || JSON.stringify(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const checkUsername = async (e: React.FormEvent) => { e.preventDefault(); if(!loginName.trim())return; setIsLoading(true); setLoginError(""); try{const res=await cloud.invoke("user-ops",{type:'check',username:loginName.trim()});if(res&&res.exists)setLoginStep("nameTaken");else setLoginStep("createAccount");}catch(e){setLoginError("连接失败")}finally{setIsLoading(false);} };
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
            onClick={() => onChange(cat as any)}
            className={`shrink-0 snap-start px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              value === cat ? `${theme.primary} text-white shadow-md` : "bg-white text-gray-500 border border-gray-100"
            }`}
          >
            {cat}
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
             <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${activity.category === '约饭' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{activity.category || "约饭"}</span>
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
      className={
        isNewYear
          ? "min-h-screen bg-gradient-to-b from-[#1A0F0F] via-[#120F26] to-[#0A0A14] text-white font-sans pb-32"
          : "min-h-screen bg-[#F4F8FF] text-[#0B1220] font-sans pb-32 transition-colors duration-500"
      }
    >
      <style>{`
      @keyframes giftWiggle {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        25% { transform: translateY(-2px) rotate(-2deg); }
        50% { transform: translateY(0) rotate(2deg); }
        75% { transform: translateY(-1px) rotate(-1deg); }
      }
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
            {/* ✅ Step1：新年倒计时卡（专题时显示） */}
            {isNewYear && (
              <div className="px-0">
                <div className="rounded-3xl bg-gradient-to-r from-[#2B0F22] via-[#1C0F2E] to-[#0F0F24] border border-white/10 shadow-xl overflow-hidden">
                  <div className="px-6 py-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black tracking-wide text-[#F5C97B]">
                        🧨 新年倒计时
                      </div>
                      <div className="text-2xl font-black mt-1">距离 {newYearCountdown.targetYear} 年</div>
                      <div className="text-white/80 text-sm font-semibold mt-1">
                        还剩 {newYearCountdown.days} 天 {formatTwoDigits(newYearCountdown.hours)}:{formatTwoDigits(newYearCountdown.minutes)}:{formatTwoDigits(newYearCountdown.seconds)}
                      </div>
                    </div>
                    <div className="text-3xl">🎆</div>
                  </div>
                  <div className="px-6 pb-5 text-white/70 text-xs font-bold">
                    打开祝福，约上同频的搭子一起跨年
                  </div>
                </div>
              </div>
            )}

            <div className="relative group"><Search className="absolute left-4 top-3.5 text-gray-400" size={20} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="寻找下一场活动..." className="w-full bg-white pl-12 pr-4 py-3 rounded-2xl font-bold outline-none shadow-sm" /></div>

            <button 
              onClick={openGlobalSquare}
              className="w-full mb-4 mt-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 text-white shadow-lg active:scale-95 transition-transform flex items-center justify-between"
            >
              <div className="text-left">
                <div className="font-black text-lg flex items-center gap-2">
                  🌍 聊天大广场 <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">LIVE</span>
                </div>
                <div className="text-xs font-bold text-white/80 mt-1">
                  全服热聊中，点击加入讨论...
                </div>
              </div>
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNewYearMode(true);
                  setNewYearOnly(true);
                  setActiveCategory("全部");
                  setTagFilter("");
                  openNewYearWish();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-red-500 font-black shadow"
              >
                🎆 新年倒计时
              </button>
              {(tagFilter || newYearMode) && (
                <button
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-bold"
                  onClick={() => {
                    setTagFilter("");
                    setNewYearMode(false);
                    setNewYearOnly(false);
                  }}
                >
                  清除专题
                </button>
              )}
            </div>

            <CategoryBar
              value={categoryFilter}
              onChange={(cat) => {
                setCategoryFilter(cat);
                setTagFilter("");
                setNewYearMode(false);
                setNewYearOnly(false);
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
                       <select value={tempProfile.gender||"保密"} onChange={e=>setTempProfile({...tempProfile, gender: e.target.value as any})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none"><option>男</option><option>女</option><option>保密</option></select>
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

      {/* ✅ 新年祝福按钮（仅专题显示） */}
      {isNewYear && activeTab === "square" && (
        <button
          onClick={openNewYearWish}
          className="fixed bottom-6 right-6 z-[60] select-none"
          aria-label="New year wish"
        >
          <div
            className="w-14 h-14 rounded-2xl bg-[#F5C97B] text-[#7A1D1D] shadow-2xl flex items-center justify-center text-2xl"
            style={{ animation: "giftWiggle 3s ease-in-out infinite" }}
          >
            🧨
          </div>
        </button>
      )}

      {/* ✅ 新年祝福弹窗 */}
      {showNewYearWish && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={closeNewYearWish}
        >
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* 弹窗卡片 */}
          <div
            className="relative w-[92vw] max-w-md rounded-3xl bg-white shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-gray-400">新年祝福</div>
                <div className="text-2xl font-black mt-1">🎆 新年好</div>
              </div>

              <button
                onClick={closeNewYearWish}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-black"
                aria-label="close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-gray-900 text-base font-bold leading-relaxed">
              {wishText}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={closeNewYearWish}
                className="flex-1 h-12 rounded-2xl bg-black text-white font-black"
              >
                收下 🎆
              </button>
              <button
                onClick={nextNewYearWish}
                className="flex-1 h-12 rounded-2xl bg-gray-100 text-gray-900 font-black"
              >
                再来一个
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 悬浮按钮与底部导航 */}
      {activeTab === 'square' && (<button onClick={() => { resetCreateDraft(); setShowCreateModal(true); }} className={`fixed bottom-24 right-6 w-14 h-14 text-white rounded-[1.2rem] flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-90 z-30 ${theme.primary}`}><Plus size={28} /></button>)}
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
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {notifications.length > 99 ? "99+" : notifications.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">通知</span>
        </button>
        {ADMIN_USERS.includes(currentUser) && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === "admin" ? "text-red-600" : "text-gray-300"}`}
          >
            <ShieldAlert size={24} strokeWidth={activeTab === "admin" ? 3 : 2} />
            <span className="text-[10px] font-bold">Admin</span>
          </button>
        )}
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'profile' ? theme.navActive : theme.navInactive}`}><User size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} /><span className="text-[10px] font-bold">我的</span></button>
      </div>

      {/* 主题弹窗 */}
      {showThemeModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-slide-up"><h3 className="text-xl font-black mb-6 text-center">选择界面风格</h3><div className="grid grid-cols-3 gap-4"><button onClick={() => handleSetTheme("warm")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='warm'?'border-orange-500 bg-orange-50':'border-transparent bg-gray-50'}`}><div className="w-8 h-8 rounded-full bg-orange-500 shadow-md"></div><span className="text-xs font-bold">暖阳橙</span></button><button onClick={() => handleSetTheme("cool")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='cool'?'border-blue-500 bg-blue-50':'border-transparent bg-gray-50'}`}><div className="w-8 h-8 rounded-full bg-blue-500 shadow-md"></div><span className="text-xs font-bold">清凉蓝</span></button><button onClick={() => handleSetTheme("nju")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='nju'?'border-purple-800 bg-purple-50':'border-transparent bg-gray-50'} relative overflow-hidden`}><div className="w-8 h-8 rounded-full bg-[#6A005F] shadow-md flex items-center justify-center">{userActivityCount < 10 && <Lock size={14} className="text-white/50"/>}</div><span className="text-xs font-bold text-[#6A005F]">南大紫</span></button></div><button onClick={() => setShowThemeModal(false)} className="w-full mt-6 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">关闭</button></div></div>)}
      
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

      {/* 发布活动弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-50 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6 pt-4"><h2 className="text-3xl font-black">发布活动</h2><button onClick={() => { resetCreateDraft(); setShowCreateModal(false); }} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">✕</button></div>
          <form onSubmit={handleCreateActivity} className="flex-1 space-y-4 overflow-y-auto pb-20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-2 w-10 rounded-full ${createStep >= s ? "bg-black" : "bg-gray-200"}`} />
                ))}
              </div>
              <div className="text-xs font-black text-gray-500">第 {createStep}/3 步</div>
            </div>

            {createStep === 1 && (
  <div className="flex flex-col gap-4">

    {/* 分类 */}
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">分类</label>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORY_OPTIONS.map((c) => (
          <label key={c} className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="category"
              value={c}
              checked={activityDraft.category === c}
              onChange={() => setActivityDraft(p => ({ ...p, category: c }))}
              className="peer hidden"
            />
            <div className="bg-gray-100 peer-checked:bg-blue-600 peer-checked:text-white py-3 rounded-xl text-center font-bold transition-all">
              {c}
            </div>
          </label>
        ))}
      </div>
    </div>

    {/* 标题 */}
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">标题</label>
      <input
        value={activityDraft.title}
        onChange={e => setActivityDraft(p => ({ ...p, title: e.target.value }))}
        required
        className="w-full text-2xl font-bold border-b-2 border-gray-100 py-3 outline-none bg-transparent"
        placeholder="例如：周末火锅局"
      />
    </div>

    {/* 时间（你这个本来就是 state，保持不动） */}
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">时间</label>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <select
          value={dateState.year}
          onChange={e => handleDateChange("year", e.target.value)}
          className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none"
        >
          {range(2025, 2030).map(y => (
            <option key={y} value={y}>{y} 年</option>
          ))}
        </select>
        <select
          value={dateState.month}
          onChange={e => handleDateChange("month", e.target.value)}
          className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none"
        >
          {range(1, 12).map(m => (
            <option key={m} value={m}>{m} 月</option>
          ))}
        </select>
        <select
          value={dateState.day}
          onChange={e => handleDateChange("day", e.target.value)}
          className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none"
        >
          {range(1, getDaysInMonth(dateState.year, dateState.month)).map(d => (
            <option key={d} value={d}>{d} 日</option>
          ))}
        </select>
        <select
          value={dateState.hour}
          onChange={e => handleDateChange("hour", e.target.value)}
          className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none"
        >
          {range(0, 23).map(h => (
            <option key={h} value={h}>{h} 时</option>
          ))}
        </select>
        <select
          value={dateState.minute}
          onChange={e => handleDateChange("minute", e.target.value)}
          className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none"
        >
          {range(0, 59).map(mi => (
            <option key={mi} value={mi}>{mi} 分</option>
          ))}
        </select>
      </div>
    </div>

    {/* 地点 */}
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">地点</label>
      <input
        value={activityDraft.location}
        onChange={e => setActivityDraft(p => ({ ...p, location: e.target.value }))}
        required
        className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none"
      />
    </div>

    {/* 人数 */}
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">人数</label>
      <div className="flex gap-4 items-center">
        <div className="flex-1 bg-gray-50 rounded-2xl p-4 flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold">最少</span>
          <input
            type="number"
            placeholder="2"
            value={activityDraft.min_people}
            onChange={e =>
              setActivityDraft(p => ({ ...p, min_people: e.target.value }))
            }
            className="w-full bg-transparent font-bold outline-none text-center"
          />
        </div>

        <span className="text-gray-300 font-bold">-</span>

        <div className="flex-1 bg-gray-50 rounded-2xl p-4 flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold">最多</span>
          <input
            type="number"
            placeholder="5"
            value={activityDraft.max_people}
            onChange={e =>
              setActivityDraft(p => ({ ...p, max_people: e.target.value }))
            }
            className="w-full bg-transparent font-bold outline-none text-center"
          />
        </div>
      </div>
    </div>

    {/* 仅限认证 */}
    <div className="flex items-center justify-between bg-purple-50 p-4 rounded-2xl border border-purple-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700">
          <ShieldCheck size={20}/>
        </div>
        <div>
          <div className="font-bold text-sm text-purple-900">仅限认证校友</div>
          <div className="text-[10px] text-purple-500 font-bold">开启后，未认证用户无法加入</div>
        </div>
      </div>

      <input
        type="checkbox"
        checked={activityDraft.requires_verification}
        onChange={e =>
          setActivityDraft(p => ({ ...p, requires_verification: e.target.checked }))
        }
      />
    </div>

    {/* 详情 */}
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">详情</label>
      <textarea
        value={activityDraft.description}
        onChange={e => setActivityDraft(p => ({ ...p, description: e.target.value }))}
        placeholder="年级要求、口味偏好、具体流程..."
        className="w-full bg-gray-50 rounded-2xl p-4 h-32 resize-none outline-none font-medium text-sm"
      />
    </div>

    {/* 标签 */}
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">标签</label>

      <div className="flex gap-2">
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
          className="flex-1 bg-gray-50 rounded-2xl p-4 font-bold outline-none"
          placeholder="输入标签，回车添加（最多6个）"
        />
        <button
          type="button"
          onClick={() => addTag(tagInput)}
          className="px-4 rounded-2xl bg-black text-white font-bold"
        >
          添加
        </button>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {['新年','跨年','倒计时','演唱会'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => addTag(t)}
            className="px-3 py-1 rounded-full bg-white border border-gray-200 text-sm font-bold"
          >
            #{t}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map(t => (
          <span key={t} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-black text-sm flex items-center gap-2">
            #{t}
            <button type="button" onClick={() => removeTag(t)} className="opacity-70 hover:opacity-100">×</button>
          </span>
        ))}
      </div>
    </div>

    <div className="text-xs font-black text-gray-500 mt-1">
      先把活动信息填清楚，下一步再设置“门槛与氛围”。
    </div>
  </div>
      )}


            {createStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="text-sm font-black">加入门槛</div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-gray-500">灵魂一问（可选）</div>
                    <div className="text-[10px] font-black text-gray-400">
                      {(activityDraft.soul_question || "").trim().length}/40
                    </div>
                  </div>
                  <textarea
                    value={activityDraft.soul_question || ""}
                    onChange={e => {
                      const v = e.target.value.slice(0, 40);
                      setActivityDraft(p => ({ ...p, soul_question: v }));
                    }}
                    placeholder="例如：你确定你是羽毛球零基础？不许来新手局虐菜！"
                    className="w-full bg-gray-50 rounded-2xl p-3 text-sm font-bold outline-none h-16 resize-none"
                  />
                </div>

                <div>
                  <div className="text-xs font-black text-gray-500 mb-2">性别要求</div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { k: "any", t: "不限" },
                      { k: "female_only", t: "仅女生" },
                      { k: "male_only", t: "仅男生" },
                    ].map(it => (
                      <button type="button" key={it.k}
                        onClick={() => setReqDraft(p => ({ ...p, gender: it.k as any }))}
                        className={`px-4 py-2 rounded-xl text-sm font-black border ${reqDraft.gender === it.k ? "bg-black text-white" : "bg-white text-gray-600"}`}
                      >
                        {it.t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black text-gray-500 mb-2">身份偏好</div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { k: "any", t: "不限" },
                      { k: "undergrad", t: "本科" },
                      { k: "graduate", t: "研究生" },
                      { k: "PhD", t: "博士" },
                    ].map(it => (
                      <button type="button" key={it.k}
                        onClick={() => setReqDraft(p => ({ ...p, identity: it.k as any }))}
                        className={`px-4 py-2 rounded-xl text-sm font-black border ${reqDraft.identity === it.k ? "bg-black text-white" : "bg-white text-gray-600"}`}
                      >
                        {it.t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black text-gray-500 mb-2">对陌生人接受度</div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { k: "ok", t: "完全 OK" },
                      { k: "new_friends", t: "想认识新朋友" },
                      { k: "has_circle", t: "我有熟人圈但欢迎加入" },
                    ].map(it => (
                      <button type="button" key={it.k}
                        onClick={() => setReqDraft(p => ({ ...p, stranger: it.k as any }))}
                        className={`px-4 py-2 rounded-xl text-sm font-black border ${reqDraft.stranger === it.k ? "bg-black text-white" : "bg-white text-gray-600"}`}
                      >
                        {it.t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black text-gray-500 mb-2">活动氛围（最多选 3 个）</div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { k: "quiet", t: "偏安静" },
                      { k: "lively", t: "偏热闹" },
                      { k: "casual", t: "轻松随意" },
                      { k: "serious", t: "比较认真" },
                      { k: "i_friendly", t: "I 人友好" },
                      { k: "e_friendly", t: "E 人友好" },
                    ].map(it => {
                      const on = reqDraft.vibe.includes(it.k);
                      return (
                        <button type="button" key={it.k}
                          onClick={() => toggleInList("vibe", it.k, 3)}
                          className={`px-4 py-2 rounded-xl text-sm font-black border ${on ? "bg-black text-white" : "bg-white text-gray-600"}`}
                        >
                          {it.t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-xs text-gray-500 font-bold leading-relaxed">
                  这些信息会在加入前展示，帮助同学判断是否合适，减少尴尬。
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div className="flex flex-col gap-4">
                <div className="text-sm font-black">发起人态度（帮助大家安心加入）</div>

                <div className="flex gap-2 flex-wrap">
                  {[
                    { k: "welcome_first_timer", t: "欢迎第一次参加搭子" },
                    { k: "welcome_solo", t: "欢迎一个人来" },
                    { k: "chat_before_decide", t: "可以先聊再决定" },
                    { k: "will_reply", t: "我会在活动内回复" },
                    { k: "no_gender_mind", t: "不介意不同性别/专业" },
                  ].map(it => {
                    const on = reqDraft.host_flags.includes(it.k);
                    return (
                      <button type="button" key={it.k}
                        onClick={() => toggleInList("host_flags", it.k, 6)}
                        className={`px-4 py-2 rounded-xl text-sm font-black border ${on ? "bg-black text-white" : "bg-white text-gray-600"}`}
                      >
                        {it.t}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-xs font-black text-gray-500 mb-2">预览（加入前会看到）</div>
                  <div className="text-sm font-black">门槛与态度摘要</div>
                  <div className="text-xs text-gray-600 font-bold mt-2">
                    性别：{reqDraft.gender === "any" ? "不限" : reqDraft.gender === "female_only" ? "仅女生" : "仅男生"}；
                    陌生人：{reqDraft.stranger === "ok" ? "完全OK" : reqDraft.stranger === "new_friends" ? "想认识新朋友" : "有熟人圈但欢迎加入"}；
                    氛围：{reqDraft.vibe.length ? reqDraft.vibe.join("、") : "未指定"}。
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (createStep === 1) { resetCreateDraft(); setShowCreateModal(false); }
                  else setCreateStep(s => (s - 1) as any);
                }}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-gray-100 text-gray-700 active:scale-95"
              >
                {createStep === 1 ? "取消" : "上一步"}
              </button>

              {createStep < 3 ? (
                <button
                  type="button"
                  onClick={() => { normalizePeople(); setCreateStep(s => (s + 1) as any); }}
                  className="flex-1 py-3 rounded-xl font-black text-sm bg-black text-white active:scale-95"
                >
                  下一步
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl font-black text-sm bg-black text-white active:scale-95 disabled:opacity-60"
                >
                  {isLoading ? "发布中..." : "发布活动"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {roomOpen && roomActivity && (
        <RoomModal activity={roomActivity} currentUser={currentUser} onClose={closeRoom} onJump={handleSquareJump} highlightMsgId={targetMsgId} />
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
                 {notifications.map((n: any) => (
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
                        handleSquareJump(n.activity_id, n.msg_id);
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
}: {
  activity: Activity;
  currentUser: string;
  onClose: () => void;
  onJump?: (id: string, msgId?: string) => void;
  highlightMsgId?: string;
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
  const timerRef = useRef<any>(null);
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
      } catch (err) {
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
      <div className="fixed inset-0 z-[999] bg-gradient-to-b from-[#961A1A] via-[#7A1212] to-[#3D0606] flex flex-col animate-fade-in text-[#FFFBEB] font-sans">
        <div className="bg-[#7A1212]/90 backdrop-blur-md px-4 py-3 shadow-lg border-b border-orange-900/30 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-2xl shadow-md border border-orange-400/30">
              🏮
            </div>
            <div>
              <div className="font-black text-base text-orange-50">新春聊天大集市</div>
              <div className="text-[10px] font-bold text-orange-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                全服热聊中 · 消息保留24h
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-red-950/40 border border-orange-900/20 rounded-full flex items-center justify-center text-orange-200/80 font-bold active:scale-90 transition-transform hover:bg-red-900/60"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-orange-900/50 scrollbar-track-transparent">
          <div className="text-center py-4">
            <span className="text-[10px] bg-red-950/40 border border-orange-900/20 text-orange-300/80 px-4 py-1.5 rounded-full font-bold">
              🧨 过年好！请文明发言，共创和谐氛围
            </span>
          </div>

          {messages.map((m, i) => {
            const mine = m.sender === currentUser;
            const highlight = !!highlightMsgId && m._id === highlightMsgId;

            if (m.msgType === "share_activity" && m.payload) {
              const act = m.payload;
              return (
                <div
                  key={i}
                  id={m._id ? `msg-${m._id}` : undefined}
                  className={`flex ${mine ? "justify-end" : "justify-start"} transition-colors duration-500 rounded-2xl ${highlight ? "animate-flash" : ""}`}
                >
                  {!mine && (
                    <div
                      className="w-8 h-8 rounded-full bg-red-950/50 border border-orange-900/30 text-orange-300 flex items-center justify-center text-xs font-black mr-2 mt-1 shrink-0 cursor-pointer"
                      onClick={() => handleAvatarClick(m.sender)}
                    >
                      {m.sender[0]}
                    </div>
                  )}
                  <div className="bg-[#FFFBF0] p-3 rounded-2xl shadow-md border border-orange-200 max-w-[260px] text-gray-900">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded">活动召集</span>
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
                      className="w-full py-2 bg-gradient-to-r from-orange-600 to-red-700 text-white text-xs font-black rounded-xl active:opacity-90 shadow-sm"
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
                      className="w-8 h-8 rounded-full bg-white/90 border border-red-100 text-red-800 shadow-sm flex items-center justify-center text-xs font-black mr-2 mt-1 shrink-0 cursor-pointer"
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
                      className="max-w-[200px] max-h-[300px] rounded-2xl border-2 border-orange-200 shadow-md object-cover bg-black/20"
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
                    className="w-8 h-8 rounded-full bg-white/90 border border-red-100 text-red-800 shadow-sm flex items-center justify-center text-xs font-black mr-2 mt-1 shrink-0 cursor-pointer"
                  >
                    {m.sender[0]}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm border ${
                    mine
                      ? "bg-gradient-to-r from-orange-600 to-red-700 border-transparent text-orange-50 rounded-tr-none shadow-orange-900/20"
                      : "bg-[#FFFBF0] text-red-950 border-red-50 rounded-tl-none"
                  }`}
                >
                  {!mine && <div className="text-[10px] font-bold text-red-900/50 mb-0.5">{m.sender}</div>}
                  <div className="text-[14px] font-medium leading-relaxed break-words whitespace-pre-wrap">
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={msgEndRef} className="h-4" />
        </div>

        <div className="bg-[#3D0606] px-4 py-3 border-t border-orange-900/30 pb-safe relative z-20">
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
              className="w-11 h-11 rounded-2xl bg-red-950/60 border border-orange-900/30 text-orange-200 flex items-center justify-center active:scale-95"
            >
              <ImageIcon size={20} />
            </button>
            <textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="说句吉祥话..."
              rows={1}
              className="flex-1 bg-red-950/40 border border-orange-900/20 rounded-2xl px-4 py-3 font-bold text-sm text-orange-50 placeholder-orange-300/40 outline-none resize-none min-h-[44px] max-h-[120px] focus:border-orange-500/50 transition-colors"
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
              className="w-12 h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white flex items-center justify-center disabled:opacity-50 disabled:grayscale active:scale-95 transition-all shadow-md shadow-orange-900/20"
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
      <div className="absolute inset-x-0 top-0 bottom-0 bg-[#EAF2FF] flex flex-col sm:max-w-md sm:mx-auto animate-slide-up">
        <div className="flex items-center justify-between px-4 pt-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/80 border border-white/60 flex items-center justify-center font-black text-gray-500 active:scale-95"
          >
            ✕
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareToSquare}
              className="h-8 px-3 rounded-full bg-orange-100 border border-orange-200 text-orange-600 text-[10px] font-black flex items-center gap-1 active:scale-95"
            >
              <Share2 size={12} /> 转发到广场
            </button>
            <div className="text-xs font-black text-gray-500 bg-white/70 px-3 py-2 rounded-full border border-white/60">
              {joined.length}/{activity.max_people}
            </div>
          </div>
        </div>

        <div className="px-4 mt-3 mb-4">
          <div className="bg-gradient-to-r from-[#2D5BFF] to-[#4CA6FF] text-white rounded-3xl px-5 py-4 shadow-lg border border-white/20 relative overflow-hidden">
            <div className="text-[11px] font-black opacity-90">房主：{host}</div>
            <div className="text-2xl font-black mt-1 leading-tight">{title}</div>
            <div className="text-[12px] font-bold opacity-90 mt-1 line-clamp-2">{activity.description || "暂无描述"}</div>
          </div>
        </div>

        <div className="flex-1 px-4 overflow-y-auto pb-24">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-black text-gray-700">房间座位 ({seatedUsers.length}/{SEAT_COUNT})</div>
            {memberLoading && (
              <div className="text-[10px] font-bold text-gray-400 animate-pulse">
                正在同步档案...
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {seats.map((u, idx) => {
              const empty = !u;
              const info = u ? (memberInfoMap[u] || null) : null;
              const isMe = u === currentUser;
              return (
                <button
                  key={idx}
                  disabled={empty}
                  onClick={() => { if (u) openUserProfile(u); }}
                  className={`relative rounded-[2rem] p-4 text-left transition active:scale-[0.99] ${empty ? "bg-white/40 border border-dashed border-gray-200" : "bg-white/85 border border-white/60 shadow-sm"}`}
                >
                  <div className="absolute top-3 right-3 text-[10px] font-black text-gray-300">#{idx + 1}</div>
                  <div className="mt-6 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${empty ? "bg-gray-100 text-gray-300" : isMe ? "bg-black text-white" : "bg-blue-100 text-blue-700"}`}>
                      {u ? u[0] : "+"}
                    </div>
                    <div className="min-w-0">
                      <div className={`font-black text-sm truncate w-20 ${empty ? "text-gray-300" : "text-gray-900"}`}>{u || "空座"}</div>
                      {!empty && <div className="text-[10px] text-gray-400 font-bold">{info?.profile?.mbti || "MBTI"}</div>}
                    </div>
                  </div>
                </button>
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
            className={`flex-1 py-4 rounded-2xl font-black text-sm transition active:scale-95 ${canChat ? "bg-black text-white" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}
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

                  if (m.msgType === "share_activity" && m.payload) {
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
