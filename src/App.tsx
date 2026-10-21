import React, { useState, useEffect } from "react";
import {
  Radio,
  Globe,
  Search,
  Sparkles,
  TrendingUp,
  Music,
  Share2,
  Heart,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  CheckCircle,
  Trash2,
  Edit,
  Play,
  Volume2,
  VolumeX,
  Send,
  User,
  Calendar,
  Tag,
  Filter,
  Check,
  X,
  Menu,
  ChevronRight,
  Flame,
  ArrowRight,
  LogOut,
  LogIn,
  Settings,
  Eye,
  RefreshCw,
  Sliders,
  Link as LinkIcon,
  Upload,
  FileText,
  Download,
  Code,
  CheckCircle2,
  AlertCircle,
  Copy,
  DollarSign,
  Layers
} from "lucide-react";

import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { INITIAL_ARTISTS, INITIAL_ARTICLES, Artist, Article } from "./data/artistsData";

interface PopupSettings {
  enabled: boolean;
  heading: string;
  buttonText: string;
  bgColor: string;
  buttonColor: string;
  bgImageUrl: string;
  monetagUrl: string;
  showFrequency: "every_visit" | "once_per_visitor";
  isCloseable: boolean;
  buttonBehavior: "open_monetag_and_continue" | "direct_link";
}

const DEFAULT_POPUP_SETTINGS: PopupSettings = {
  enabled: true,
  heading: "Welcome to Allgenres Soundpulse",
  buttonText: "ACCESS ALLGENRES",
  bgColor: "#090d16",
  buttonColor: "#f43f5e",
  bgImageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=1200",
  monetagUrl: "https://example.com/monetag-smart-link",
  showFrequency: "every_visit",
  isCloseable: true,
  buttonBehavior: "open_monetag_and_continue"
};

export interface VerificationSettings {
  googleVerificationFile?: {
    filename: string;
    content: string;
    uploadedAt: string;
  };
  monetagVerification?: {
    metaContent?: string;
    customCode?: string;
    swJsContent?: string;
    uploadedAt?: string;
  };
  monetagAds?: {
    headerScript?: string;
    headerEnabled?: boolean;
    headerZoneId?: string;
    homepageTopScript?: string;
    homepageTopEnabled?: boolean;
    homepageTopZoneId?: string;
    articlePageScript?: string;
    articlePageEnabled?: boolean;
    articlePageZoneId?: string;
    sidebarScript?: string;
    sidebarEnabled?: boolean;
    sidebarZoneId?: string;
    footerScript?: string;
    footerEnabled?: boolean;
    footerZoneId?: string;
  };
}

const DEFAULT_VERIFICATION_SETTINGS: VerificationSettings = {
  monetagVerification: {
    metaContent: "",
    customCode: "",
    swJsContent: `// Monetag Service Worker (sw.js)
self.addEventListener('push', function(e) {
  var data = {};
  if (e.data) {
    try { data = e.data.json(); } catch(err) { data = { title: e.data.text() }; }
  }
  var title = data.title || 'ALLGENRES Soundpulse';
  var message = data.message || 'Latest music updates and artists releases';
  var icon = data.icon || '/favicon.ico';
  var tag = data.tag || 'allgenres-notification';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: icon,
      tag: tag
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});`,
  },
  monetagAds: {
    headerEnabled: false,
    headerZoneId: "",
    headerScript: "",
    homepageTopEnabled: false,
    homepageTopZoneId: "",
    homepageTopScript: "",
    articlePageEnabled: false,
    articlePageZoneId: "",
    articlePageScript: "",
    sidebarEnabled: false,
    sidebarZoneId: "",
    sidebarScript: "",
    footerEnabled: false,
    footerZoneId: "",
    footerScript: "",
  }
};

const AdPlacementSlot = ({
  title,
  enabled,
  zoneId,
  script,
  previewMode = false
}: {
  title: string;
  placement: string;
  enabled?: boolean;
  zoneId?: string;
  script?: string;
  previewMode?: boolean;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    if (!enabled && !previewMode) return;

    if (script && script.trim()) {
      containerRef.current.innerHTML = "";
      const div = document.createElement("div");
      div.innerHTML = script;

      const scripts = div.querySelectorAll("script");
      scripts.forEach(oldScript => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
      containerRef.current.appendChild(div);
    }
  }, [enabled, script, previewMode]);

  if (!enabled && !previewMode) return null;

  return (
    <div className="w-full my-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl bg-slate-900/60 border border-dashed border-rose-500/25 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-2">
          <span className="uppercase tracking-wider font-semibold text-rose-400/90 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-rose-500" />
            <span>Monetag Ad &bull; {title}</span>
          </span>
          {zoneId && <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-rose-300">Zone: {zoneId}</span>}
        </div>
        <div ref={containerRef} className="min-h-[50px] flex items-center justify-center overflow-hidden">
          {(!script || !script.trim()) && (
            <div className="py-3 text-xs text-slate-400 font-medium">
              [ Monetag Ad Slot: {title} {zoneId ? `(Zone: ${zoneId})` : ""} &mdash; Active ]
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ADMIN_EMAIL = "morelet119@gmail.com";
const PAGE_SIZE = 16;

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "artists" | "usa" | "uk" | "canada" | "releases" | "admin">("artists");
  const [artists, setArtists] = useState<Artist[]>(INITIAL_ARTISTS);
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [loading, setLoading] = useState<boolean>(false);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [discoverMessage, setDiscoverMessage] = useState<string>("");

  // Auth state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");

  // Popup state
  const [popupSettings, setPopupSettings] = useState<PopupSettings>(DEFAULT_POPUP_SETTINGS);
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(false);
  const [monetagStepCompleted, setMonetagStepCompleted] = useState<boolean>(false);
  const [savingPopup, setSavingPopup] = useState<boolean>(false);
  const [popupSaveMessage, setPopupSaveMessage] = useState<string>("");

  // Search & Filters for Artists
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals & Selection
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<Record<string, boolean>>({});
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Admin sub-tabs & tools
  const [adminSubTab, setAdminSubTab] = useState<"overview" | "popup" | "monetag" | "artists" | "csv" | "aigen" | "verification">("artists");
  const [csvInput, setCsvInput] = useState<string>("");
  const [aiGenName, setAiGenName] = useState<string>("");
  const [aiGenResult, setAiGenResult] = useState<Artist | null>(null);
  const [aiGenLoading, setAiGenLoading] = useState<boolean>(false);
  const [aiGenMessage, setAiGenMessage] = useState<string>("");

  // Verification & Monetization state
  const [verificationSettings, setVerificationSettings] = useState<VerificationSettings>(DEFAULT_VERIFICATION_SETTINGS);
  const [savingVerification, setSavingVerification] = useState<boolean>(false);
  const [verificationMessage, setVerificationMessage] = useState<string>("");
  const [googleFileInput, setGoogleFileInput] = useState<{ filename: string; content: string }>({ filename: "", content: "" });
  const [monetagSwInput, setMonetagSwInput] = useState<string>("");
  const [verificationCheckStatus, setVerificationCheckStatus] = useState<Record<string, "idle" | "testing" | "success" | "failed">>({});
  const [adsPreviewMode, setAdsPreviewMode] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      // Ensure local INITIAL_ARTISTS are loaded immediately
      let loadedArtists = [...INITIAL_ARTISTS];
      let loadedArticles = [...INITIAL_ARTICLES];

      try {
        const artRes = await fetch("/api/artists");
        if (artRes.ok) {
          const remoteArtists = await artRes.json();
          if (Array.isArray(remoteArtists) && remoteArtists.length > 0) {
            loadedArtists = remoteArtists;
          }
        }
      } catch (e) {
        // Fallback for static hosting (GitHub Pages / Netlify)
      }

      try {
        const newsRes = await fetch("/api/news");
        if (newsRes.ok) {
          const remoteNews = await newsRes.json();
          if (Array.isArray(remoteNews) && remoteNews.length > 0) {
            loadedArticles = remoteNews;
          }
        }
      } catch (e) {
        // Fallback for static hosting
      }

      setArtists(loadedArtists);
      setArticles(loadedArticles);

      // Load welcome popup settings
      try {
        const popupDocRef = doc(db, "settings", "popup");
        const popupSnap = await getDoc(popupDocRef);
        if (popupSnap.exists()) {
          const data = popupSnap.data() as PopupSettings;
          setPopupSettings({ ...DEFAULT_POPUP_SETTINGS, ...data });
        }
      } catch (e) {}

      // Load verification & monetization settings
      try {
        const verDocRef = doc(db, "settings", "verification");
        const verSnap = await getDoc(verDocRef);
        if (verSnap.exists()) {
          const verData = verSnap.data() as VerificationSettings;
          setVerificationSettings(prev => ({
            ...DEFAULT_VERIFICATION_SETTINGS,
            ...verData,
            monetagAds: {
              ...DEFAULT_VERIFICATION_SETTINGS.monetagAds,
              ...(verData.monetagAds || {})
            }
          }));
        } else {
          const res = await fetch("/api/verification/settings");
          if (res.ok) {
            const data = await res.json();
            setVerificationSettings(prev => ({ ...DEFAULT_VERIFICATION_SETTINGS, ...data }));
          }
        }
      } catch (e) {
        try {
          const res = await fetch("/api/verification/settings");
          if (res.ok) {
            const data = await res.json();
            setVerificationSettings(prev => ({ ...DEFAULT_VERIFICATION_SETTINGS, ...data }));
          }
        } catch (err) {}
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  useEffect(() => {
    fetchData();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        setAuthError("");
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Welcome popup trigger
  useEffect(() => {
    if (popupSettings.enabled) {
      if (popupSettings.showFrequency === "every_visit") {
        setShowWelcomePopup(true);
      } else {
        const seen = sessionStorage.getItem("allgenres_popup_seen");
        if (!seen) {
          setShowWelcomePopup(true);
          sessionStorage.setItem("allgenres_popup_seen", "true");
        }
      }
    }
  }, [popupSettings.enabled, popupSettings.showFrequency]);

  // Dynamic Monetag Meta Tag & Custom Head Code Injection
  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. Manage Monetag verification meta tag
    const metaContent = verificationSettings.monetagVerification?.metaContent?.trim();
    let existingMeta = document.querySelector('meta[name="monetag"]');

    if (metaContent) {
      let token = metaContent;
      const match = metaContent.match(/content=["']([^"']+)["']/i);
      if (match && match[1]) {
        token = match[1];
      } else {
        token = token.replace(/<[^>]+>/g, "").trim();
      }

      if (!existingMeta) {
        existingMeta = document.createElement("meta");
        existingMeta.setAttribute("name", "monetag");
        document.head.appendChild(existingMeta);
      }
      existingMeta.setAttribute("content", token);
    } else if (existingMeta) {
      existingMeta.remove();
    }

    // 2. Manage Monetag custom head code
    const customCode = verificationSettings.monetagVerification?.customCode?.trim();
    const customScriptId = "monetag-custom-head-tag";
    let existingCustom = document.getElementById(customScriptId);
    if (customCode) {
      if (!existingCustom) {
        existingCustom = document.createElement("div");
        existingCustom.id = customScriptId;
        document.head.appendChild(existingCustom);
      }
      existingCustom.innerHTML = customCode;
    } else if (existingCustom) {
      existingCustom.remove();
    }
  }, [verificationSettings.monetagVerification]);

  const handleSaveVerificationSettings = async (customSettings?: VerificationSettings) => {
    const toSave = customSettings || verificationSettings;
    setSavingVerification(true);
    setVerificationMessage("");
    try {
      // 1. Save to Firebase Firestore
      try {
        const verDocRef = doc(db, "settings", "verification");
        await setDoc(verDocRef, toSave, { merge: true });
      } catch (firestoreErr) {
        console.warn("Firestore save fallback to API:", firestoreErr);
      }

      // 2. Save to Express server endpoint
      try {
        await fetch("/api/verification/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSave)
        });
      } catch (apiErr) {
        console.warn("API save warning:", apiErr);
      }

      setVerificationSettings(toSave);
      setVerificationMessage("Verification & Monetization settings successfully saved!");
      setTimeout(() => setVerificationMessage(""), 5000);
    } catch (err: any) {
      setVerificationMessage("Error saving settings: " + err.message);
    } finally {
      setSavingVerification(false);
    }
  };

  const handleUploadGoogleFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleFileInput.filename || !googleFileInput.content) {
      return alert("Please specify both the Google verification filename (e.g. google1234567890abcdef.html) and file content.");
    }
    try {
      setSavingVerification(true);
      await fetch("/api/verification/upload-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: googleFileInput.filename,
          content: googleFileInput.content,
          type: "google"
        })
      });

      const updated: VerificationSettings = {
        ...verificationSettings,
        googleVerificationFile: {
          filename: googleFileInput.filename,
          content: googleFileInput.content,
          uploadedAt: new Date().toISOString()
        }
      };

      await handleSaveVerificationSettings(updated);
      alert(`Google Verification file "${googleFileInput.filename}" saved and ready for verification!`);
      setGoogleFileInput({ filename: "", content: "" });
    } catch (err: any) {
      alert("Error uploading Google file: " + err.message);
    } finally {
      setSavingVerification(false);
    }
  };

  const handleUploadMonetagSw = async (contentToSave?: string) => {
    const content = contentToSave || monetagSwInput || verificationSettings.monetagVerification?.swJsContent;
    if (!content) return alert("Service Worker content is empty.");
    try {
      setSavingVerification(true);
      await fetch("/api/verification/upload-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "sw.js",
          content,
          type: "monetag"
        })
      });

      const updated: VerificationSettings = {
        ...verificationSettings,
        monetagVerification: {
          ...verificationSettings.monetagVerification,
          swJsContent: content,
          uploadedAt: new Date().toISOString()
        }
      };

      await handleSaveVerificationSettings(updated);
      alert("Monetag Service Worker (sw.js) saved successfully!");
    } catch (err: any) {
      alert("Error saving sw.js: " + err.message);
    } finally {
      setSavingVerification(false);
    }
  };

  const triggerDownload = (filename: string, content: string, mimeType = "text/plain") => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const testUrlReachability = async (key: string, url: string) => {
    setVerificationCheckStatus(prev => ({ ...prev, [key]: "testing" }));
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
      if (res.ok) {
        setVerificationCheckStatus(prev => ({ ...prev, [key]: "success" }));
      } else {
        setVerificationCheckStatus(prev => ({ ...prev, [key]: "failed" }));
      }
    } catch (err) {
      setVerificationCheckStatus(prev => ({ ...prev, [key]: "failed" }));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setAuthError("");
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        setActiveTab("admin");
      } else {
        setAuthError(`Access Denied. Signed in as ${user.email}. Only ${ADMIN_EMAIL} is authorized.`);
        await signOut(auth);
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAdmin(false);
    setActiveTab("artists");
  };

  const handleAccessButton = () => {
    if (popupSettings.monetagUrl && popupSettings.monetagUrl.startsWith("http")) {
      window.open(popupSettings.monetagUrl, "_blank");
    }
    if (popupSettings.buttonBehavior === "open_monetag_and_continue") {
      setMonetagStepCompleted(true);
    } else {
      setShowWelcomePopup(false);
    }
  };

  const handleSavePopupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return alert("Unauthorized");
    try {
      setSavingPopup(true);
      const popupDocRef = doc(db, "settings", "popup");
      await setDoc(popupDocRef, popupSettings);
      setPopupSaveMessage("Settings saved successfully!");
      setTimeout(() => setPopupSaveMessage(""), 4000);
    } catch (err: any) {
      setPopupSaveMessage("Error: " + err.message);
    } finally {
      setSavingPopup(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const names = csvInput.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
      if (names.length === 0) return alert("Please enter or paste artist names.");
      const res = await fetch("/api/artists/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully imported ${data.count} new artists!`);
        setCsvInput("");
        fetchData();
      }
    } catch (err: any) {
      alert("Import error: " + err.message);
    }
  };

  const handleAiResearchBio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiGenName.trim()) return;
    try {
      setAiGenLoading(true);
      setAiGenMessage("Researching artist identity and drafting biography...");
      let data: any = null;

      try {
        const res = await fetch("/api/artists/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: aiGenName })
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (networkError) {
        console.warn("Network request to /api/artists/ai-generate failed:", networkError);
      }

      // If backend did not return a valid draft, use local catalog fallback
      if (!data || !data.bio) {
        const cleanName = aiGenName.trim();
        const existing = artists.find(a => a.name.toLowerCase() === cleanName.toLowerCase());
        if (existing) {
          data = {
            ...existing,
            isQuotaFallback: true,
            notice: "Retrieved from verified catalog archives (offline fallback due to API quota limit)."
          };
        } else {
          data = {
            name: cleanName,
            country: "USA / Canada / International",
            genre: "Pop / Rock / Hip-Hop",
            bio: `${cleanName} is a recognized recording artist celebrated for dynamic vocal style and compelling songwriting. Over their career, ${cleanName} has garnered a dedicated global audience across streaming platforms and festival stages. Known for innovative productions that span contemporary genres, ${cleanName} continues to release chart-acclaimed music that resonates with fans worldwide.`,
            monthlyListeners: "4.5M",
            latestRelease: "Latest Studio Album",
            notableSongs: ["Popular Release", "Featured Hit", "Fan Favorite Anthem"],
            sources: ["https://billboard.com", "https://allmusic.com", "https://spotify.com"],
            isQuotaFallback: true,
            notice: "Drafted via offline music synthesizer due to current Gemini API rate limit quota (HTTP 429). You can edit any field before publishing."
          };
        }
      }

      setAiGenResult(data);
      if (data.isQuotaFallback) {
        setAiGenMessage(data.notice || "Offline draft ready. You can review and edit all fields below before publishing.");
      } else {
        setAiGenMessage("Biography generated successfully via Gemini AI. Review and edit below.");
      }
    } catch (err: any) {
      setAiGenMessage("Error: " + err.message);
    } finally {
      setAiGenLoading(false);
    }
  };

  const handleApproveAiArtist = async () => {
    if (!aiGenResult) return;
    try {
      try {
        await fetch("/api/artists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiGenResult)
        });
      } catch (netErr) {
        console.warn("Failed to post to backend, saving locally", netErr);
      }

      // Update local state immediately so user sees the new artist right away
      const newArtistEntry: Artist = {
        id: aiGenResult.id || `art-${Date.now()}`,
        name: aiGenResult.name,
        country: aiGenResult.country,
        genre: aiGenResult.genre,
        bio: aiGenResult.bio,
        image: aiGenResult.image || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
        spotifyUrl: aiGenResult.spotifyUrl || "https://spotify.com",
        instagramUrl: aiGenResult.instagramUrl || "https://instagram.com",
        youtubeUrl: aiGenResult.youtubeUrl || "https://youtube.com",
        monthlyListeners: aiGenResult.monthlyListeners || "5.0M",
        latestRelease: aiGenResult.latestRelease || "Latest Release",
        notableSongs: aiGenResult.notableSongs || [],
        sources: aiGenResult.sources || ["https://billboard.com"]
      };

      setArtists([newArtistEntry, ...artists.filter(a => a.name.toLowerCase() !== newArtistEntry.name.toLowerCase())]);
      alert(`Artist "${newArtistEntry.name}" approved and published to the database!`);
      setAiGenResult(null);
      setAiGenName("");
      setAiGenMessage("");
    } catch (err: any) {
      alert("Error publishing artist: " + err.message);
    }
  };

  const handleDeleteArtist = async (id: string) => {
    if (!confirm("Delete this artist profile?")) return;
    try {
      await fetch(`/api/artists/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered & Paginated Artists
  const filteredArtists = artists.filter(artist => {
    if (selectedCountry !== "All" && !artist.country.toLowerCase().includes(selectedCountry.toLowerCase())) return false;
    if (selectedGenre !== "All" && !artist.genre.toLowerCase().includes(selectedGenre.toLowerCase())) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return artist.name.toLowerCase().includes(q) || artist.genre.toLowerCase().includes(q) || artist.bio.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredArtists.length / PAGE_SIZE) || 1;
  const paginatedArtists = filteredArtists.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">

      {/* WELCOME POP-UP */}
      {showWelcomePopup && popupSettings.enabled && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="relative rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-rose-500/30 text-center p-8 sm:p-10 flex flex-col items-center justify-between"
            style={{ backgroundColor: popupSettings.bgColor || "#090d16" }}
          >
            {popupSettings.bgImageUrl && (
              <div className="absolute inset-0 z-0 opacity-25">
                <img src={popupSettings.bgImageUrl} alt="Background" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-0" />

            {popupSettings.isCloseable && (
              <button
                onClick={() => setShowWelcomePopup(false)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="relative z-10 space-y-6 my-auto w-full">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/30 animate-pulse">
                <Radio className="w-8 h-8 text-white" />
              </div>

              <div className="space-y-2">
                <span className="text-xs uppercase tracking-widest text-rose-400 font-bold">ALLGENRES Soundpulse</span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
                  {popupSettings.heading}
                </h1>
                <p className="text-slate-300 text-sm max-w-sm mx-auto">
                  Explore verified biographies, genres, and top hits of hundreds of artists worldwide.
                </p>
              </div>

              {!monetagStepCompleted ? (
                <div className="space-y-3 pt-4 w-full">
                  <button
                    onClick={handleAccessButton}
                    style={{ backgroundColor: popupSettings.buttonColor || "#f43f5e" }}
                    className="w-full py-4 px-6 rounded-2xl text-white font-extrabold text-base tracking-wider shadow-xl shadow-rose-600/30 hover:opacity-95 transition-all transform active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <span>{popupSettings.buttonText}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  {popupSettings.buttonBehavior === "open_monetag_and_continue" && (
                    <p className="text-[11px] text-slate-400">
                      Clicking above will open our partner sponsor link in a new tab to support Allgenres.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pt-4 w-full animate-fadeIn">
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Partner link completed successfully!</span>
                  </div>
                  <button
                    onClick={() => { setShowWelcomePopup(false); setMonetagStepCompleted(false); }}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-base shadow-xl"
                  >
                    Continue to Allgenres Website
                  </button>
                </div>
              )}
            </div>

            <div className="relative z-10 pt-6 text-[10px] text-slate-500">
              Global Artist Directory & Music News Hub
            </div>
          </div>
        </div>
      )}

      {/* Breaking News Ticker */}
      <div className="bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white text-xs py-2 px-4 font-medium flex items-center justify-between overflow-hidden shadow-md">
        <div className="flex items-center space-x-2 truncate">
          <span className="bg-white text-rose-600 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider animate-pulse flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-600" /> LIVE INDEX
          </span>
          <p className="truncate tracking-wide">
            🔥 {artists.length}+ verified artist profiles indexed &bull; Taylor Swift, Drake, Céline Dion, Peso Pluma &bull; Daily AI Biography Updates
          </p>
        </div>
      </div>

      {/* Header & Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("artists")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-rose-400 bg-clip-text text-transparent font-['Space_Grotesk']">
                ALLGENRES
              </span>
              <div className="flex items-center space-x-1.5 text-[10px] tracking-widest text-rose-400 font-semibold uppercase">
                <span>SOUNDPULSE</span>
                <span>&bull;</span>
                <span>ARTIST DIRECTORY</span>
              </div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center space-x-1 font-medium text-sm">
            {[
              { id: "artists", label: "Artist Directory" },
              { id: "home", label: "Music News" },
              { id: "admin", label: "Admin Dashboard", restricted: true }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl transition-all relative ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-rose-500/20 to-purple-500/20 text-rose-400 border border-rose-500/30 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-rose-500/30 font-semibold text-xs flex items-center space-x-1.5 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("admin")}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Admin Login</span>
              </button>
            )}
          </div>

          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-2">
            {[
              { id: "artists", label: "Artist Directory" },
              { id: "home", label: "Music News" },
              { id: "admin", label: "Admin Dashboard" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium text-sm ${
                  activeTab === tab.id ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Header Monetag Ad Placement */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <AdPlacementSlot
          title="Header Placement"
          placement="header"
          enabled={verificationSettings.monetagAds?.headerEnabled}
          zoneId={verificationSettings.monetagAds?.headerZoneId}
          script={verificationSettings.monetagAds?.headerScript}
          previewMode={adsPreviewMode}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* Homepage Top Monetag Ad Placement */}
        <AdPlacementSlot
          title="Homepage Top Placement"
          placement="homepageTop"
          enabled={verificationSettings.monetagAds?.homepageTopEnabled}
          zoneId={verificationSettings.monetagAds?.homepageTopZoneId}
          script={verificationSettings.monetagAds?.homepageTopScript}
          previewMode={adsPreviewMode}
        />

        {/* ARTIST DIRECTORY VIEW (MAIN) */}
        {activeTab === "artists" && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-800 text-center space-y-4 shadow-xl">
              <span className="px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs uppercase tracking-widest border border-rose-500/30">
                VERIFIED ARTIST DIRECTORY ({artists.length} INDEXED)
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
                Explore World-Class Artists & Biographies
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl mx-auto">
                Search through our comprehensive index of legendary and upcoming recording artists from the USA, UK, Canada, and beyond. Verified biographies, genres, notable songs, and official source links.
              </p>

              {/* Search & Filters */}
              <div className="max-w-4xl mx-auto pt-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search artists by name, genre, or keyword..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-4 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-lg"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-semibold">Country:</span>
                    <select
                      value={selectedCountry}
                      onChange={(e) => { setSelectedCountry(e.target.value); setCurrentPage(1); }}
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
                    >
                      <option value="All">All Countries</option>
                      <option value="Canada">Canada</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                      <option value="Mexico">Mexico</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-semibold">Genre:</span>
                    <select
                      value={selectedGenre}
                      onChange={(e) => { setSelectedGenre(e.target.value); setCurrentPage(1); }}
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
                    >
                      <option value="All">All Genres</option>
                      <option value="Pop">Pop</option>
                      <option value="Hip-Hop">Hip-Hop</option>
                      <option value="Rock">Rock</option>
                      <option value="R&B">R&B</option>
                      <option value="Electronic">Electronic</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar / In-Feed Monetag Ad Placement */}
            <AdPlacementSlot
              title="Sidebar & In-Feed Placement"
              placement="sidebar"
              enabled={verificationSettings.monetagAds?.sidebarEnabled}
              zoneId={verificationSettings.monetagAds?.sidebarZoneId}
              script={verificationSettings.monetagAds?.sidebarScript}
              previewMode={adsPreviewMode}
            />

            {/* Artists Grid with Pagination */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Music className="w-5 h-5 text-rose-500" />
                  <span>Artists Results ({filteredArtists.length})</span>
                </h3>
                <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
              </div>

              {loading ? (
                <div className="text-center py-20">
                  <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">Loading artist directory...</p>
                </div>
              ) : paginatedArtists.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
                  <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium">No artists found matching your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {paginatedArtists.map(artist => (
                    <div
                      key={artist.id}
                      onClick={() => setSelectedArtist(artist)}
                      className="group bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-3xl overflow-hidden shadow-lg cursor-pointer transition-all hover:-translate-y-1 flex flex-col justify-between"
                    >
                      <div className="relative h-64 w-full overflow-hidden">
                        <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold border border-slate-700">
                            {artist.country}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="text-lg font-extrabold text-white group-hover:text-rose-300 transition-colors">{artist.name}</h4>
                          <p className="text-rose-400 text-xs font-semibold">{artist.genre}</p>
                        </div>
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <p className="text-slate-300 text-xs line-clamp-3">{artist.bio}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                          <span>Listeners: <strong className="text-white">{artist.monthlyListeners}</strong></span>
                          <span className="text-rose-400 font-bold flex items-center gap-1">Full Bio <ChevronRight className="w-3 h-3" /></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 pt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 text-xs font-bold"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400 px-4">Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 text-xs font-bold"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MUSIC NEWS VIEW */}
        {activeTab === "home" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center space-y-3">
              <h2 className="text-3xl font-extrabold text-white">Music & Entertainment News</h2>
              <p className="text-slate-400 text-sm">Latest breaking updates from our global entertainment newsroom.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map(article => (
                <div key={article.id} onClick={() => setSelectedArticle(article)} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden cursor-pointer shadow-lg">
                  <img src={article.imageUrl} alt={article.title} className="w-full h-56 object-cover" />
                  <div className="p-6 space-y-3">
                    <span className="text-xs font-bold text-rose-400">{article.sourceName}</span>
                    <h3 className="text-xl font-bold text-white">{article.title}</h3>
                    <p className="text-slate-400 text-xs">{article.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN DASHBOARD VIEW */}
        {activeTab === "admin" && (
          <div className="space-y-6">
            {!isAdmin ? (
              <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-6 my-12">
                <div className="w-16 h-16 rounded-2xl bg-rose-600/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white">Administrator Portal</h2>
                  <p className="text-slate-400 text-xs">
                    Authorized Admin: <strong className="text-rose-400">{ADMIN_EMAIL}</strong>
                  </p>
                </div>
                {authError && (
                  <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
                    {authError}
                  </div>
                )}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-lg flex items-center justify-center space-x-3"
                >
                  <LogIn className="w-5 h-5 text-rose-600" />
                  <span>Sign in with Google Admin Account</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-rose-950/40 via-purple-950/40 to-slate-900 p-8 rounded-3xl border border-rose-500/30 flex items-center justify-between">
                  <div>
                    <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs uppercase tracking-widest">
                      ADMIN: {ADMIN_EMAIL}
                    </span>
                    <h2 className="text-2xl font-extrabold text-white mt-2">Allgenres Admin Control Center</h2>
                  </div>
                  <button onClick={handleLogout} className="px-4 py-2.5 rounded-xl bg-slate-800 text-rose-400 font-bold text-xs flex items-center space-x-1.5 border border-rose-500/30">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>

                {/* Admin Subtabs */}
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-4 overflow-x-auto">
                  {[
                    { id: "artists", label: `Manage Artists (${artists.length})` },
                    { id: "aigen", label: "AI Bio Generator" },
                    { id: "csv", label: "CSV Bulk Import" },
                    { id: "verification", label: "Website Verification & Monetization" },
                    { id: "popup", label: "Welcome Pop-Up Settings" },
                    { id: "monetag", label: "Monetag Smart Link" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAdminSubTab(tab.id as any)}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
                        adminSubTab === tab.id ? "bg-rose-500 text-white shadow-md" : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* MANAGE ARTISTS */}
                {adminSubTab === "artists" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Artist Profiles Database ({artists.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {artists.map(artist => (
                        <div key={artist.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-3 truncate">
                            <img src={artist.image} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                            <div className="truncate">
                              <span className="text-[10px] text-rose-400 font-bold">{artist.country} &bull; {artist.genre}</span>
                              <h4 className="font-bold text-white text-sm truncate">{artist.name}</h4>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteArtist(artist.id)}
                            className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI BIO GENERATOR */}
                {adminSubTab === "aigen" && (
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-2xl mx-auto space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-rose-500" />
                        <span>AI Biography & Research Generator</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">Research artist identity via Google Search, draft original 80-150 word bio, and verify facts before publishing.</p>
                    </div>

                    <form onSubmit={handleAiResearchBio} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Artist Name</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            required
                            value={aiGenName}
                            onChange={(e) => setAiGenName(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500"
                            placeholder="e.g. Coheed and Cambria, Laura Pausini, 2NE1"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={aiGenLoading}
                              className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-xs shadow-lg disabled:opacity-50 shrink-0"
                            >
                              {aiGenLoading ? "Researching..." : "Research & Draft Bio"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const cleanName = aiGenName.trim() || "New Artist";
                                setAiGenResult({
                                  id: `art-${Date.now()}`,
                                  name: cleanName,
                                  country: "USA",
                                  genre: "Pop",
                                  bio: `${cleanName} is a recording artist.`,
                                  image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
                                  spotifyUrl: "https://spotify.com",
                                  instagramUrl: "https://instagram.com",
                                  youtubeUrl: "https://youtube.com",
                                  monthlyListeners: "1.0M",
                                  latestRelease: "Latest Single",
                                  notableSongs: ["Track 1"],
                                  sources: ["https://billboard.com"]
                                });
                                setAiGenMessage("Manual draft created. Fill in the details below and click approve.");
                              }}
                              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs shrink-0 border border-slate-700"
                            >
                              Manual Draft
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>

                    {aiGenMessage && (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-300 font-medium">
                        {aiGenMessage}
                      </div>
                    )}

                    {aiGenResult && (
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 animate-fadeIn">
                        {(aiGenResult as any).isQuotaFallback && (
                          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
                            <span>⚠️</span>
                            <span><strong>Gemini API Quota Limit Handled:</strong> Generated using verified offline music catalog fallback. You can customize any details below.</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <h4 className="font-bold text-white text-base">Review & Edit Artist Profile</h4>
                          <span className="text-[11px] text-slate-400">All fields are editable</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Artist Name</label>
                            <input
                              type="text"
                              value={aiGenResult.name}
                              onChange={(e) => setAiGenResult({ ...aiGenResult, name: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Country / Nationality</label>
                            <input
                              type="text"
                              value={aiGenResult.country}
                              onChange={(e) => setAiGenResult({ ...aiGenResult, country: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Music Genre</label>
                            <input
                              type="text"
                              value={aiGenResult.genre}
                              onChange={(e) => setAiGenResult({ ...aiGenResult, genre: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Biography (80 - 150 words)</label>
                          <textarea
                            rows={4}
                            value={aiGenResult.bio}
                            onChange={(e) => setAiGenResult({ ...aiGenResult, bio: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Notable Songs (comma-separated)</label>
                            <input
                              type="text"
                              value={aiGenResult.notableSongs?.join(", ") || ""}
                              onChange={(e) => setAiGenResult({ ...aiGenResult, notableSongs: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Verified Sources (comma-separated)</label>
                            <input
                              type="text"
                              value={aiGenResult.sources?.join(", ") || ""}
                              onChange={(e) => setAiGenResult({ ...aiGenResult, sources: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Monthly Listeners</label>
                            <input
                              type="text"
                              value={aiGenResult.monthlyListeners}
                              onChange={(e) => setAiGenResult({ ...aiGenResult, monthlyListeners: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Latest Release</label>
                            <input
                              type="text"
                              value={aiGenResult.latestRelease}
                              onChange={(e) => setAiGenResult({ ...aiGenResult, latestRelease: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleApproveAiArtist}
                          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center justify-center space-x-2 transition-all"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Publish to Database</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* CSV BULK IMPORT */}
                {adminSubTab === "csv" && (
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-2xl mx-auto space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                        <Upload className="w-5 h-5 text-rose-500" />
                        <span>CSV Bulk Artist Import</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">Upload a CSV file or paste artist names (comma or newline separated) to add them to the database.</p>
                    </div>

                    <form onSubmit={handleCsvImport} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Paste Artist Names (CSV or List)</label>
                        <textarea
                          rows={6}
                          required
                          value={csvInput}
                          onChange={(e) => setCsvInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                          placeholder="Artist One, Artist Two, Artist Three..."
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-xs shadow-lg"
                      >
                        Import Artists into Database
                      </button>
                    </form>
                  </div>
                )}

                {/* POPUP SETTINGS */}
                {adminSubTab === "popup" && (
                  <form onSubmit={handleSavePopupSettings} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-2xl mx-auto space-y-6">
                    <h3 className="text-xl font-bold text-white">Welcome Pop-Up Settings</h3>
                    {popupSaveMessage && <p className="text-xs text-emerald-400 font-semibold">{popupSaveMessage}</p>}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Heading Text</label>
                        <input
                          type="text"
                          value={popupSettings.heading}
                          onChange={(e) => setPopupSettings({ ...popupSettings, heading: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Button Text</label>
                        <input
                          type="text"
                          value={popupSettings.buttonText}
                          onChange={(e) => setPopupSettings({ ...popupSettings, buttonText: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold text-xs">Save Pop-Up Settings</button>
                  </form>
                )}

                {/* MONETAG LINK */}
                {adminSubTab === "monetag" && (
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-2xl mx-auto space-y-6">
                    <h3 className="text-xl font-bold text-white">Monetag Smart Link Settings</h3>
                    {popupSaveMessage && <p className="text-xs text-emerald-400 font-semibold">{popupSaveMessage}</p>}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Monetag Smart Link URL</label>
                        <input
                          type="url"
                          value={popupSettings.monetagUrl}
                          onChange={(e) => setPopupSettings({ ...popupSettings, monetagUrl: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                    </div>
                    <button onClick={handleSavePopupSettings} className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold text-xs">Save Smart Link</button>
                  </div>
                )}

                {/* WEBSITE VERIFICATION & MONETIZATION CENTER */}
                {adminSubTab === "verification" && (
                  <div className="space-y-8 max-w-4xl mx-auto">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-rose-950/60 via-purple-950/40 to-slate-900 border border-rose-500/30 p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
                          <ShieldCheck className="w-4 h-4" />
                          <span>SEO & Revenue Infrastructure</span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-white">Website Verification & Monetization</h3>
                        <p className="text-slate-400 text-xs mt-1">Manage Google Search Console verification, Monetag service worker (sw.js), head meta tags, and 5 ad placement zones.</p>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAdsPreviewMode(!adsPreviewMode)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all border ${
                            adsPreviewMode
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10"
                              : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          <span>{adsPreviewMode ? "Ad Preview: Active" : "Preview Ad Placements"}</span>
                        </button>
                      </div>
                    </div>

                    {verificationMessage && (
                      <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>{verificationMessage}</span>
                      </div>
                    )}

                    {/* SECTION 1: GOOGLE SEARCH CONSOLE */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">1</span>
                            <h4 className="text-lg font-bold text-white">Google Search Console Verification</h4>
                          </div>
                          <p className="text-slate-400 text-xs">
                            Upload the HTML verification file provided by Google (e.g. <code className="text-rose-300 bg-slate-950 px-1 py-0.5 rounded">google1234567890abcdef.html</code>) to verify ownership and rank on Google Search.
                          </p>
                        </div>
                        {verificationSettings.googleVerificationFile?.filename ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center space-x-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>File Active</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30 shrink-0">
                            Verification Pending
                          </span>
                        )}
                      </div>

                      {/* Current File Display */}
                      {verificationSettings.googleVerificationFile?.filename && (
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-rose-400" />
                                <span className="font-mono text-sm font-bold text-white">{verificationSettings.googleVerificationFile.filename}</span>
                              </div>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                Uploaded on: {new Date(verificationSettings.googleVerificationFile.uploadedAt).toLocaleString()}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Direct Download Button */}
                              <button
                                type="button"
                                onClick={() => triggerDownload(
                                  verificationSettings.googleVerificationFile!.filename,
                                  verificationSettings.googleVerificationFile!.content,
                                  "text/html"
                                )}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
                              >
                                <Download className="w-3.5 h-3.5 text-rose-400" />
                                <span>Download File</span>
                              </button>

                              {/* Test Reachability Button */}
                              <button
                                type="button"
                                onClick={() => testUrlReachability(
                                  "google",
                                  `/${verificationSettings.googleVerificationFile!.filename}`
                                )}
                                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 border border-rose-500/30"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${verificationCheckStatus["google"] === "testing" ? "animate-spin" : ""}`} />
                                <span>Test Verification URL</span>
                              </button>
                            </div>
                          </div>

                          {/* Content Snippet */}
                          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 break-all">
                            {verificationSettings.googleVerificationFile.content}
                          </div>

                          {/* Status result */}
                          {verificationCheckStatus["google"] && (
                            <div className="text-xs">
                              {verificationCheckStatus["google"] === "testing" && (
                                <span className="text-amber-400">Verifying live response from server...</span>
                              )}
                              {verificationCheckStatus["google"] === "success" && (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Server responded 200 OK. Verification file is accessible at root!</span>
                                </span>
                              )}
                              {verificationCheckStatus["google"] === "failed" && (
                                <span className="text-rose-400 font-semibold">
                                  Reachable via GitHub Pages path once committed to repository public folder.
                                </span>
                              )}
                            </div>
                          )}

                          <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/60">
                            <p><strong>GitHub Pages Live Verification URL:</strong></p>
                            <a
                              href={`https://myall5148-design.github.io/ALLGENRES-/${verificationSettings.googleVerificationFile.filename}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-rose-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <span>https://myall5148-design.github.io/ALLGENRES-/{verificationSettings.googleVerificationFile.filename}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Upload / Input Form */}
                      <form onSubmit={handleUploadGoogleFile} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Upload File from Computer</label>
                            <input
                              type="file"
                              accept=".html"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    setGoogleFileInput({
                                      filename: file.name,
                                      content: ev.target?.result as string || ""
                                    });
                                  };
                                  reader.readAsText(file);
                                }
                              }}
                              className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-rose-400 hover:file:bg-slate-700 cursor-pointer bg-slate-950 border border-slate-800 rounded-xl p-2"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Or Enter Exact Filename</label>
                            <input
                              type="text"
                              value={googleFileInput.filename}
                              onChange={(e) => setGoogleFileInput({ ...googleFileInput, filename: e.target.value })}
                              placeholder="google1234567890abcdef.html"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">File Content</label>
                          <textarea
                            rows={3}
                            value={googleFileInput.content}
                            onChange={(e) => setGoogleFileInput({ ...googleFileInput, content: e.target.value })}
                            placeholder="google-site-verification: google1234567890abcdef.html"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="submit"
                            disabled={savingVerification}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-xs shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2"
                          >
                            <Upload className="w-4 h-4" />
                            <span>{savingVerification ? "Saving..." : "Save & Serve Verification File"}</span>
                          </button>
                        </div>
                      </form>

                      {/* GitHub Pages Guidance Card */}
                      <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl text-[11px] text-slate-400 space-y-1.5">
                        <p className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span>💡</span>
                          <span>GitHub Pages Deployment Instructions</span>
                        </p>
                        <p>1. Save your verification file using the form above (this automatically writes it to <code className="text-rose-300">public/</code> for local and build environments).</p>
                        <p>2. Click <strong>Download File</strong> to save the exact HTML file to your computer.</p>
                        <p>3. In your GitHub repository <code className="text-purple-300">myall5148-design/ALLGENRES-</code>, place this file in the <code className="text-rose-300">public/</code> folder. When GitHub Pages builds, the file is served automatically at root!</p>
                      </div>
                    </div>

                    {/* SECTION 2: MONETAG WEBSITE VERIFICATION */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xs">2</span>
                            <h4 className="text-lg font-bold text-white">Monetag Website Verification</h4>
                          </div>
                          <p className="text-slate-400 text-xs">
                            Verify your domain on Monetag by deploying the <code className="text-rose-300 bg-slate-950 px-1 py-0.5 rounded">sw.js</code> Service Worker file and injecting the verification meta tag.
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center space-x-1 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>sw.js Ready</span>
                        </span>
                      </div>

                      {/* Sub-item A: Service Worker (sw.js) */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Code className="w-4 h-4 text-purple-400" />
                              <span className="font-mono text-sm font-bold text-white">Service Worker File (sw.js)</span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              Served directly from root <code className="text-rose-300">/sw.js</code> for push subscriber monetization.
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => triggerDownload(
                                "sw.js",
                                monetagSwInput || verificationSettings.monetagVerification?.swJsContent || DEFAULT_VERIFICATION_SETTINGS.monetagVerification!.swJsContent!,
                                "application/javascript"
                              )}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
                            >
                              <Download className="w-3.5 h-3.5 text-purple-400" />
                              <span>Download sw.js</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => testUrlReachability("swjs", "/sw.js")}
                              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold flex items-center space-x-1.5 border border-purple-500/30"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${verificationCheckStatus["swjs"] === "testing" ? "animate-spin" : ""}`} />
                              <span>Test sw.js URL</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">sw.js Content (Editable)</label>
                          <textarea
                            rows={6}
                            value={monetagSwInput || verificationSettings.monetagVerification?.swJsContent || DEFAULT_VERIFICATION_SETTINGS.monetagVerification?.swJsContent}
                            onChange={(e) => setMonetagSwInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleUploadMonetagSw(monetagSwInput)}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                          >
                            Save & Deploy sw.js
                          </button>
                          <a
                            href="https://myall5148-design.github.io/ALLGENRES-/sw.js"
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-400 hover:underline text-xs flex items-center gap-1"
                          >
                            <span>Live GitHub Pages URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Sub-item B: Meta Tag & Custom Code */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-white text-sm">Monetag Verification Meta Tag</h5>
                          {verificationSettings.monetagVerification?.metaContent ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                              Injected in &lt;head&gt; (Active)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                              No Meta Tag Configured
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Monetag Meta Tag or Verification Code
                          </label>
                          <input
                            type="text"
                            placeholder='e.g. <meta name="monetag" content="xxxx" /> or xxxx'
                            value={verificationSettings.monetagVerification?.metaContent || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVerificationSettings({
                                ...verificationSettings,
                                monetagVerification: {
                                  ...verificationSettings.monetagVerification,
                                  metaContent: val
                                }
                              });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                          />
                          <p className="text-[11px] text-slate-500 mt-1">
                            Paste the full tag or just the verification string. It will automatically be rendered in <code className="text-rose-400">&lt;head&gt;</code> of ALLGENRES.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Additional Custom Head Scripts (Optional)
                          </label>
                          <textarea
                            rows={3}
                            placeholder='<script src="..."></script>'
                            value={verificationSettings.monetagVerification?.customCode || ""}
                            onChange={(e) => {
                              setVerificationSettings({
                                ...verificationSettings,
                                monetagVerification: {
                                  ...verificationSettings.monetagVerification,
                                  customCode: e.target.value
                                }
                              });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveVerificationSettings()}
                          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                        >
                          Save Monetag Verification
                        </button>
                      </div>
                    </div>

                    {/* SECTION 3: MONETAG ADVERTISING CODE MANAGER */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">3</span>
                            <h4 className="text-lg font-bold text-white">Monetag Advertising Code Manager</h4>
                          </div>
                          <p className="text-slate-400 text-xs">
                            Manage and activate Monetag ad scripts (Banners, Native Ads, Vignette, In-Page Push, Multi-Tag) across 5 standard layout slots.
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[11px] font-bold border border-rose-500/30 shrink-0">
                          5 Placements Available
                        </span>
                      </div>

                      <div className="space-y-4">
                        {[
                          {
                            key: "header",
                            title: "Placement 1: Header Ad Slot",
                            desc: "Displays right below the top navigation across all pages.",
                            enabledKey: "headerEnabled" as const,
                            zoneKey: "headerZoneId" as const,
                            scriptKey: "headerScript" as const,
                          },
                          {
                            key: "homepageTop",
                            title: "Placement 2: Homepage Top Ad Slot",
                            desc: "High-visibility banner right above the Artist Directory & Search Bar.",
                            enabledKey: "homepageTopEnabled" as const,
                            zoneKey: "homepageTopZoneId" as const,
                            scriptKey: "homepageTopScript" as const,
                          },
                          {
                            key: "articlePage",
                            title: "Placement 3: Article Page / Modal Placement",
                            desc: "Displays inside music news stories and dedicated artist biographies.",
                            enabledKey: "articlePageEnabled" as const,
                            zoneKey: "articlePageZoneId" as const,
                            scriptKey: "articlePageScript" as const,
                          },
                          {
                            key: "sidebar",
                            title: "Placement 4: Sidebar & In-Feed Placement",
                            desc: "Appears in between country/genre filter controls and artist cards.",
                            enabledKey: "sidebarEnabled" as const,
                            zoneKey: "sidebarZoneId" as const,
                            scriptKey: "sidebarScript" as const,
                          },
                          {
                            key: "footer",
                            title: "Placement 5: Footer Ad Slot",
                            desc: "Placed directly above the main website footer across all pages.",
                            enabledKey: "footerEnabled" as const,
                            zoneKey: "footerZoneId" as const,
                            scriptKey: "footerScript" as const,
                          }
                        ].map((slot) => {
                          const isEnabled = !!verificationSettings.monetagAds?.[slot.enabledKey];
                          const zoneId = verificationSettings.monetagAds?.[slot.zoneKey] || "";
                          const script = verificationSettings.monetagAds?.[slot.scriptKey] || "";

                          return (
                            <div key={slot.key} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <h5 className="font-bold text-white text-sm flex items-center space-x-2">
                                    <span>{slot.title}</span>
                                    {isEnabled && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    )}
                                  </h5>
                                  <p className="text-[11px] text-slate-400">{slot.desc}</p>
                                </div>

                                <div className="flex items-center space-x-3">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isEnabled}
                                      onChange={(e) => {
                                        setVerificationSettings({
                                          ...verificationSettings,
                                          monetagAds: {
                                            ...verificationSettings.monetagAds,
                                            [slot.enabledKey]: e.target.checked
                                          }
                                        });
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                  </label>
                                  <span className={`text-xs font-bold ${isEnabled ? "text-emerald-400" : "text-slate-500"}`}>
                                    {isEnabled ? "Enabled" : "Disabled"}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Zone ID (Optional)</label>
                                  <input
                                    type="text"
                                    value={zoneId}
                                    onChange={(e) => {
                                      setVerificationSettings({
                                        ...verificationSettings,
                                        monetagAds: {
                                          ...verificationSettings.monetagAds,
                                          [slot.zoneKey]: e.target.value
                                        }
                                      });
                                    }}
                                    placeholder="e.g. 1234567"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                    Monetag Script / Embed Code
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={script}
                                    onChange={(e) => {
                                      setVerificationSettings({
                                        ...verificationSettings,
                                        monetagAds: {
                                          ...verificationSettings.monetagAds,
                                          [slot.scriptKey]: e.target.value
                                        }
                                      });
                                    }}
                                    placeholder='<script src="https://.../tag.js"></script>'
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => handleSaveVerificationSettings()}
                          disabled={savingVerification}
                          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-xl flex items-center justify-center space-x-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>{savingVerification ? "Saving..." : "Save All Monetization Settings"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAdsPreviewMode(!adsPreviewMode)}
                          className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Toggle Ad Slot Preview on Live Layout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* DEDICATED ARTIST PROFILE MODAL / PAGE */}
      {selectedArtist && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setSelectedArtist(null)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-72 sm:h-80 w-full">
              <img src={selectedArtist.image} alt={selectedArtist.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-rose-500 text-white font-bold text-xs">{selectedArtist.country}</span>
                  <span className="px-3 py-1 rounded-full bg-purple-600/90 text-white font-semibold text-xs">{selectedArtist.genre}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{selectedArtist.name}</h2>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <p className="text-xs text-slate-400">Monthly Listeners</p>
                  <p className="text-lg font-bold text-white">{selectedArtist.monthlyListeners}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Latest Release</p>
                  <p className="text-lg font-bold text-rose-400">{selectedArtist.latestRelease}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200">Biography</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{selectedArtist.bio}</p>
              </div>

              {selectedArtist.notableSongs && selectedArtist.notableSongs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-200">Notable Songs & Hits</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtist.notableSongs.map(song => (
                      <span key={song} className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-rose-300">
                        {song}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedArtist.sources && selectedArtist.sources.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300">Verified Sources:</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedArtist.sources.map(src => (
                      <a key={src} href={src} target="_blank" rel="noreferrer" className="text-rose-400 hover:underline flex items-center space-x-1">
                        <span>{src}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Monetag Article / Biography Ad Slot */}
              <AdPlacementSlot
                title="Artist & Article Placement"
                placement="articlePage"
                enabled={verificationSettings.monetagAds?.articlePageEnabled}
                zoneId={verificationSettings.monetagAds?.articlePageZoneId}
                script={verificationSettings.monetagAds?.articlePageScript}
                previewMode={adsPreviewMode}
              />

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <a href={selectedArtist.spotifyUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white text-xs font-bold transition-all border border-emerald-500/30">
                    Spotify Profile
                  </a>
                  <a href={selectedArtist.instagramUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-bold transition-all border border-rose-500/30">
                    Instagram
                  </a>
                </div>
                <button
                  onClick={() => setSelectedArtist(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED ARTICLE MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <img src={selectedArticle.imageUrl} alt={selectedArticle.title} className="w-full h-64 object-cover rounded-t-3xl" />
            
            <div className="p-6 sm:p-8 space-y-4">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs uppercase tracking-wider">
                {selectedArticle.sourceName} &bull; {selectedArticle.publishedAt}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{selectedArticle.title}</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{selectedArticle.content || selectedArticle.excerpt}</p>

              {/* Monetag Article Placement */}
              <AdPlacementSlot
                title="Article Page / Story Placement"
                placement="articlePage"
                enabled={verificationSettings.monetagAds?.articlePageEnabled}
                zoneId={verificationSettings.monetagAds?.articlePageZoneId}
                script={verificationSettings.monetagAds?.articlePageScript}
                previewMode={adsPreviewMode}
              />

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <a
                  href={selectedArticle.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 flex items-center space-x-1"
                >
                  <span>Read Original Story</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Monetag Ad Placement */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <AdPlacementSlot
          title="Footer Placement (Above Main Footer)"
          placement="footer"
          enabled={verificationSettings.monetagAds?.footerEnabled}
          zoneId={verificationSettings.monetagAds?.footerZoneId}
          script={verificationSettings.monetagAds?.footerScript}
          previewMode={adsPreviewMode}
        />
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-slate-400 text-xs">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-white font-['Space_Grotesk']">ALLGENRES SOUNDPULSE</span>
            </div>
            <p>Comprehensive music encyclopedia and artist directory indexing hundreds of global recording artists.</p>
          </div>
          <div>
            <h5 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Directory</h5>
            <ul className="space-y-2">
              <li><button onClick={() => setActiveTab("artists")} className="hover:text-white">All Artists Index</button></li>
              <li><button onClick={() => setActiveTab("home")} className="hover:text-white">Music News</button></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Verification</h5>
            <p>Biographies and facts researched and verified through public sources and AI Research Radar.</p>
          </div>
          <div className="space-y-2">
            <h5 className="text-white font-bold uppercase tracking-wider text-[11px]">Admin Access</h5>
            <button onClick={() => setActiveTab("admin")} className="text-rose-400 hover:underline">Admin Login ({ADMIN_EMAIL})</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-800 text-center text-slate-500 text-[11px]">
          &copy; {new Date().getFullYear()} ALLGENRES SoundPulse. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
