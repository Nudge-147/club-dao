import React, { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  arrayUnion,
  query,
  orderBy,
  setDoc,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  Users,
  MapPin,
  Plus,
  CheckCircle,
  Zap,
  Menu,
  Coffee,
  Utensils,
  ShoppingBag,
  Cpu,
  Coins,
  BrainCircuit,
  Wallet,
  Loader2,
  XCircle,
} from "lucide-react";

// ==========================================
// ✅ 你的 Firebase 配置
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCIAf7BOKCdykZxkhVVGAqw8KOXjBpHH6Q",
  authDomain: "partyup-a3360.firebaseapp.com",
  projectId: "partyup-a3360",
  storageBucket: "partyup-a3360.firebasestorage.app",
  messagingSenderId: "277533602568",
  appId: "1:277533602568:web:78b1479413ae43212e72bd",
  measurementId: "G-Q9T6ZSWQYZ"
};

// --- 初始化 Firebase（防止 Vite HMR 重复 init 导致白屏）---
let app: any;
let db: any;
let auth: any;
let firebaseInitError: string | null = null;

try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e: any) {
  console.error("Firebase 初始化失败:", e);
  console.log("[Firebase] projectId =", firebaseConfig.projectId);
  firebaseInitError = e?.message || "Firebase 初始化失败";
}

// --- Types ---
type TechRole =
  | "Web3 Builder"
  | "AI Researcher"
  | "Fintech PM"
  | "Fullstack Dev"
  | "Crypto Trader"
  | "Student";
type Category = "Alpha Dinner" | "Coffee Chat" | "Hackathon Fuel" | "Group Order (拼单)";
type Level = "Newbie" | "Contributor" | "OG" | "Whale";
type ActivityStatus = "active" | "completed";

interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  role: TechRole;
  tags: string[];
  walletAddress: string;
}

interface Activity {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  creatorRole: TechRole;
  title: string;
  category: Category;
  description: string;
  minPeople: number;
  maxPeople: number;
  currentPeople: number;
  participants: string[];
  levelReq: Level;
  locationName: string;
  time: string;
  topics: string[];
  aaMode: boolean;
  status: ActivityStatus;
  createdAt: number;
}

const generateWallet = () =>
  "0x" +
  Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16))
    .join("")
    .toUpperCase() +
  "..." +
  Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16))
    .join("")
    .toUpperCase();

const generateAvatar = (seed: string) => `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}`;

// --- Components ---
const Navbar = ({
  activeTab,
  setActiveTab,
  user,
}: {
  activeTab: string;
  setActiveTab: (t: any) => void;
  user: UserProfile | null;
}) => (
  <nav className="w-full bg-white border-b border-gray-100 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("home")}>
      <div className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center">
        <Cpu size={18} />
      </div>
      <h1 className="text-xl md:text-2xl font-serif font-bold tracking-tight text-gray-900">
        ClubDAO<span className="text-[#62005F]">.</span>
      </h1>
    </div>

    <div className="hidden md:flex items-center gap-8 font-serif text-sm font-medium tracking-wide text-gray-500">
      <button
        onClick={() => setActiveTab("home")}
        className={`hover:text-black transition-colors ${activeTab === "home" ? "text-black font-bold" : ""}`}
      >
        广场 (HUB)
      </button>
      <button
        onClick={() => setActiveTab("create")}
        className={`hover:text-black transition-colors ${activeTab === "create" ? "text-black font-bold" : ""}`}
      >
        发起活动 (MINT)
      </button>
      <button
        onClick={() => setActiveTab("profile")}
        className={`hover:text-black transition-colors ${activeTab === "profile" ? "text-black font-bold" : ""}`}
      >
        我的 (IDENTITY)
      </button>
    </div>

    <div className="flex items-center gap-4">
      {user ? (
        <>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs font-mono text-gray-600">
            <Wallet size={14} />
            <span>{user.walletAddress}</span>
          </div>
          <img
            src={user.avatar}
            alt="Profile"
            className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer"
            onClick={() => setActiveTab("profile")}
          />
        </>
      ) : (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="animate-spin" size={14} /> 连接节点中...
        </div>
      )}
      <Menu className="md:hidden text-gray-800" />
    </div>
  </nav>
);

const HeroSection = ({ onCreate }: { onCreate: () => void }) => (
  <div className="w-full bg-[#62005F] text-white rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center text-center shadow-xl relative overflow-hidden mb-12 mx-auto max-w-6xl">
    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
      <div className="absolute top-10 left-10">
        <BrainCircuit size={120} />
      </div>
      <div className="absolute bottom-10 right-10">
        <Coins size={120} />
      </div>
    </div>
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-widest mb-6">
      <Zap size={12} className="text-yellow-200" />
      Web3 • AI • Fintech
    </div>
    <h2 className="text-4xl md:text-6xl font-black font-serif tracking-tight mb-4 drop-shadow-sm z-10">
      聚餐 · 社交 · 共建
    </h2>
    <p className="text-lg md:text-xl font-serif opacity-90 mb-10 max-w-2xl font-light z-10">
      Fintech & AI 俱乐部成员的专属社交 DAO。<br />
      喝杯咖啡找合伙人，拼单 AA，共享 Alpha 信息。
    </p>
    <div className="flex gap-4 z-10">
      <button
        onClick={onCreate}
        className="px-8 py-3.5 bg-white text-[#62005F] font-bold font-serif rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all flex items-center gap-2"
      >
        <Plus size={18} /> 发起聚会 (Initiate)
      </button>
    </div>
  </div>
);

const ActivityCard = ({
  act,
  onJoin,
  onClose,
  isJoined,
  currentUserId,
}: {
  act: Activity;
  onJoin: (a: Activity) => void;
  onClose: (a: Activity) => void;
  isJoined: boolean;
  currentUserId: string;
}) => {
  const getIcon = (cat: Category) => {
    if (cat.includes("Coffee")) return <Coffee size={16} />;
    if (cat.includes("Group")) return <ShoppingBag size={16} />;
    if (cat.includes("Hackathon")) return <Zap size={16} />;
    return <Utensils size={16} />;
  };
  const isFull = act.currentPeople >= act.maxPeople;
  const isCreator = currentUserId === act.creatorId;

  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-[#62005F] transition-all hover:shadow-[4px_4px_0px_0px_rgba(98,0,95,1)] relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600 rounded-bl-xl border-b border-l border-gray-100 flex items-center gap-1 group-hover:bg-[#62005F] group-hover:text-white group-hover:border-[#62005F] transition-colors">
        {getIcon(act.category)} {act.category}
      </div>
      <div className="flex items-start gap-3 mb-4 mt-2">
        <img src={act.creatorAvatar} className="w-10 h-10 rounded-full border border-gray-200" alt="avatar" />
        <div>
          <h3 className="font-serif font-bold text-lg leading-tight text-gray-900 line-clamp-2">
            {act.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] uppercase font-bold bg-black text-white px-1.5 py-0.5 rounded">
              {act.creatorRole}
            </span>
            <span className="text-xs text-gray-400 font-serif">{act.time}</span>
          </div>
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-4 font-light leading-relaxed line-clamp-3 flex-grow">{act.description}</p>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {act.topics.map((t) => (
            <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
              #{t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
            <span className="flex items-center gap-1">
              <Users size={14} /> {act.currentPeople}/{act.maxPeople}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={14} /> {act.locationName}
            </span>
          </div>

          {isCreator ? (
            <button
              onClick={() => onClose(act)}
              className="rounded-lg px-4 py-1.5 text-xs font-bold transition-colors bg-white border border-[#E64A4A] text-[#E64A4A] hover:bg-[#E64A4A] hover:text-white flex items-center gap-1"
            >
              <XCircle size={14} /> 召集完毕 (Close)
            </button>
          ) : (
            <button
              onClick={() => onJoin(act)}
              disabled={isJoined || isFull}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors border ${
                isJoined
                  ? "bg-green-50 border-green-200 text-green-700"
                  : isFull
                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-black text-white hover:bg-[#62005F] border-black hover:border-[#62005F]"
              }`}
            >
              {isJoined ? "已加入 (Minted)" : isFull ? "已满员 (Sold Out)" : "加入 (Join DAO)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function PartyUpApp() {
  const [activeTab, setActiveTab] = useState<"home" | "create" | "profile">("home");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showToast, setShowToast] = useState<{ msg: string; type: "success" | "info" } | null>(null);
  const [loading, setLoading] = useState(true);

  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    category: "Alpha Dinner",
    minPeople: 2,
    maxPeople: 4,
    levelReq: "Newbie",
    aaMode: true,
  });

  const [filterType, setFilterType] = useState<string>("全部");

  const triggerToast = (msg: string, type: "success" | "info" = "success") => {
    setShowToast({ msg, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  // ✅ 如果 Firebase init 失败，直接给出可见错误，避免白屏
  if (firebaseInitError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="max-w-xl w-full bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-red-700 mb-2">Firebase 初始化失败</h2>
          <p className="text-sm text-red-700 break-words">{firebaseInitError}</p>
          <p className="text-sm text-gray-600 mt-4">
            打开浏览器控制台（Console）看完整报错，常见原因是 Vite 热更新导致重复初始化或环境变量/配置问题。
          </p>
        </div>
      </div>
    );
  }

  // --- Auth & user profile ---
  useEffect(() => {
    if (!auth || !db) return;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setCurrentUser(userSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              name: `DAO Member ${user.uid.slice(0, 4)}`,
              avatar: generateAvatar(user.uid),
              role: "Student",
              tags: ["Newbie"],
              walletAddress: generateWallet(),
            };
            await setDoc(userRef, newProfile);
            setCurrentUser(newProfile);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth/Profile 初始化失败:", e);
        triggerToast("登录初始化失败", "info");
      }
    });

    return () => unsubAuth();
  }, [auth, db]);

  // --- Activities listener ---
  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const acts = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Activity));
        const activeActs = acts.filter((a) => a.status === "active" || !a.status);
        setActivities(activeActs);
        setLoading(false);
      },
      (error) => {
        console.error("监听失败:", error);
        setLoading(false);
        triggerToast("活动监听失败", "info");
      }
    );

    return () => unsubscribe();
  }, [db]);

  const handleCreate = async () => {
    if (!db) return;
    if (!newActivity.title || !newActivity.locationName || !newActivity.time) {
      triggerToast("请完善所有协议字段。", "info");
      return;
    }
    if (!currentUser) return;

    try {
      const actData = {
        creatorId: currentUser.uid,
        creatorName: currentUser.name,
        creatorAvatar: currentUser.avatar,
        creatorRole: currentUser.role,
        title: newActivity.title!,
        category: newActivity.category as Category,
        description: newActivity.description || "",
        minPeople: newActivity.minPeople ?? 2,
        maxPeople: newActivity.maxPeople ?? 4,
        currentPeople: 1,
        participants: [currentUser.uid],
        levelReq: newActivity.levelReq as Level,
        locationName: newActivity.locationName!,
        time: newActivity.time!,
        topics: ["Tech", "Social"],
        aaMode: newActivity.aaMode ?? true, // ✅ 修正：支持 false
        status: "active" as ActivityStatus,
        createdAt: Date.now(),
      };

      await addDoc(collection(db, "activities"), actData);
      setActiveTab("home");
      triggerToast("活动区块铸造成功!");

      setNewActivity({
        category: "Alpha Dinner",
        minPeople: 2,
        maxPeople: 4,
        levelReq: "Newbie",
        aaMode: true,
      });
    } catch (e) {
      console.error(e);
      triggerToast("创建失败", "info");
    }
  };

  // ✅ 并发安全 Join：事务 + 防重复 + 防超员
  const handleJoin = async (act: Activity) => {
    if (!db) return;
    if (!currentUser) return;

    const actRef = doc(db, "activities", act.id);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(actRef);
        if (!snap.exists()) throw new Error("活动不存在");

        const data = snap.data() as Activity;
        const participants = data.participants || [];
        const currentPeople = data.currentPeople || 0;
        const maxPeople = data.maxPeople || 0;

        if (participants.includes(currentUser.uid)) {
          throw new Error("你已加入该活动");
        }

        if (currentPeople >= maxPeople) {
          throw new Error("活动已满员");
        }

        tx.update(actRef, {
          participants: arrayUnion(currentUser.uid),
          currentPeople: currentPeople + 1,
        });
      });

      triggerToast("席位铸造完成！");
    } catch (e: any) {
      triggerToast(e?.message || "加入失败", "info");
    }
  };

  const handleClose = async (act: Activity) => {
    if (!db) return;
    if (!currentUser || currentUser.uid !== act.creatorId) return;
    if (!window.confirm("确定要结束召集吗？")) return;

    try {
      const actRef = doc(db, "activities", act.id);
      await updateDoc(actRef, { status: "completed" });
      triggerToast("活动已归档。", "info");
    } catch (e) {
      triggerToast("操作失败", "info");
    }
  };

  const filteredActivities = useMemo(() => {
    let result = activities;
    if (filterType !== "全部") result = result.filter((a) => a.category === filterType);
    return result;
  }, [activities, filterType]);

  if (loading && !activities.length) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-[#62005F]">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-serif font-bold">Connecting to ClubDAO Nodes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-[#62005F] selection:text-white">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} />
      <main className="container mx-auto px-4 py-8 pb-20 max-w-6xl">
        {activeTab === "home" && (
          <div className="animate-fade-in-up">
            <HeroSection onCreate={() => setActiveTab("create")} />

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 max-w-5xl mx-auto gap-4">
              <h3 className="text-xl font-serif font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>最新活动 (Live Events)
              </h3>

              <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
                {["全部", "Alpha Dinner", "Coffee Chat", "Hackathon Fuel", "Group Order (拼单)"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterType(cat)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all border ${
                      filterType === cat
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {filteredActivities.map((act) => (
                <ActivityCard
                  key={act.id}
                  act={act}
                  onJoin={handleJoin}
                  onClose={handleClose}
                  isJoined={act.participants?.includes(currentUser?.uid || "")}
                  currentUserId={currentUser?.uid || ""}
                />
              ))}
            </div>

            {filteredActivities.length === 0 && (
              <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-6 max-w-5xl mx-auto">
                <p className="text-gray-400 font-serif">暂无活动区块 (No Blocks Found)</p>
                <button onClick={() => setActiveTab("create")} className="mt-4 text-[#62005F] font-bold hover:underline">
                  铸造创世区块？(Initiate Genesis Block)
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "create" && (
          <div className="max-w-2xl mx-auto bg-white border-2 border-black rounded-2xl p-8 md:p-12 animate-fade-in-up shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-bold text-gray-900">发起聚会 (Initiate)</h2>
              <p className="text-gray-500 mt-2 font-mono text-sm">创建一个社交智能合约。</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">活动主题 (Title)</label>
                <input
                  type="text"
                  value={newActivity.title || ""}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  placeholder="例如：DeFi 赛道研讨晚餐局"
                  className="w-full p-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-lg transition-all outline-none font-serif text-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">类型 (Type)</label>
                  <select
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-black font-mono text-sm"
                    value={newActivity.category}
                    onChange={(e) => setNewActivity({ ...newActivity, category: e.target.value as Category })}
                  >
                    <option>Alpha Dinner</option>
                    <option>Coffee Chat</option>
                    <option>Hackathon Fuel</option>
                    <option>Group Order (拼单)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">参与门槛 (Access)</label>
                  <select
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-black font-mono text-sm"
                    value={newActivity.levelReq}
                    onChange={(e) => setNewActivity({ ...newActivity, levelReq: e.target.value as Level })}
                  >
                    <option value="Newbie">Newbie (所有人可见)</option>
                    <option value="Contributor">Contributor (进阶成员)</option>
                    <option value="OG">OG (专家限定)</option>
                    <option value="Whale">Whale (资方限定)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">时空坐标 (Where & When)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="地点 (例如：肯德基)"
                    value={newActivity.locationName || ""}
                    onChange={(e) => setNewActivity({ ...newActivity, locationName: e.target.value })}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="时间 (例如：19:00)"
                    value={newActivity.time || ""}
                    onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">活动详情 & 议程</label>
                <textarea
                  rows={3}
                  value={newActivity.description || ""}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-black"
                  placeholder="我们聊什么？吃什么？"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  onClick={handleCreate}
                  className="flex-1 bg-black text-white font-mono font-bold text-lg py-3 rounded-lg hover:bg-[#62005F] transition-colors shadow-lg"
                >
                  发布活动 (DEPLOY)
                </button>
                <button onClick={() => setActiveTab("home")} className="px-6 py-3 border border-gray-200 rounded-lg font-bold hover:bg-gray-50">
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && currentUser && (
          <div className="max-w-3xl mx-auto mt-10 animate-fade-in-up">
            <div className="bg-white border-2 border-black rounded-[2rem] p-8 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(98,0,95,1)]">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 rounded-full border-4 border-black bg-white overflow-hidden shadow-md shrink-0">
                  <img src={currentUser.avatar} className="w-full h-full object-cover" alt="profile" />
                </div>
                <div className="text-center md:text-left flex-1">
                  <div className="inline-block px-3 py-1 bg-[#62005F] text-white text-xs font-bold uppercase rounded-full mb-2">
                    {currentUser.role}
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-gray-900 mb-1">{currentUser.name}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 font-mono text-xs mb-4">
                    <Wallet size={12} />
                    {currentUser.walletAddress}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {currentUser.tags.map((t) => (
                      <span key={t} className="px-3 py-1 border border-gray-300 rounded text-xs font-bold text-gray-600">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-dashed border-gray-300">
                <h3 className="font-bold text-sm uppercase tracking-wide text-gray-400 mb-4">信誉评分 (Reputation Score)</h3>
                <div className="flex justify-between items-end">
                  <div className="text-4xl font-black font-serif">
                    850<span className="text-lg text-gray-400 font-normal">/900</span>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>基于 SBT (灵魂绑定代币) 验证</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-2 mt-2 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full w-[85%]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showToast && (
        <div className="fixed bottom-10 right-10 z-50 animate-bounce-in">
          <div
            className={`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black rounded-lg px-6 py-4 flex items-center gap-3 ${
              showToast.type === "success" ? "bg-[#62005F] text-white" : "bg-black text-white"
            }`}
          >
            {showToast.type === "success" ? <CheckCircle size={20} /> : <Zap size={20} />}
            <span className="font-bold font-serif">{showToast.msg}</span>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
}
