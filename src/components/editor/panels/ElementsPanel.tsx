import { useState, type ChangeEvent } from "react";
import {
  Activity, Airplay, AlarmClock, Shapes, AlertCircle, Archive, ArrowDown, CalendarClock, CircleAlert, CircleDot, CloudDownload, FilePlus, FolderPlus, GitCommit, ListFilter, MessageSquare, Move, Palette, PenTool, RotateCcw, Scan, ShieldAlert, Smile, SquareCheck, Tags, UserRound, WandSparkles, Workflow, WifiOff, ArrowDownCircle, ArrowLeft, ArrowLeftCircle, ArrowRight, ArrowRightCircle, ArrowUp, ArrowUpCircle, AtSign, Award, Baby, BadgeCheck, Banknote, BarChart3, Battery, Bell, Bike, Bluetooth, Bold, BookOpen, Bookmark, Box, Briefcase, CalendarDays, Camera, Cast, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clipboard, Clock, Cloud, Code, Cog, Compass, Copy, CreditCard, Database, Disc3, Download, Edit3, Ellipsis, Eye, FileText, Film, Filter, Flag, Flame, Folder, FolderOpen, Gauge, Gift, GitBranch, Github, Globe, Grid2X2, HardDrive, Hash, Headphones, Heart, HelpCircle, Home, ImagePlus, Inbox, Info, KeyRound, Laptop, Layers, LayoutDashboard, Lightbulb, Link, List, LoaderCircle, Lock, LogIn, LogOut, Mail, MapPin, Maximize2, Menu, MessageCircle, Mic, Minus, Monitor, Moon, MoreHorizontal, MousePointer2, Music, Navigation, Paperclip, Pause, Pencil, Phone, Pin, Play, Plus, Printer, Radio, RefreshCw, Rocket, Save, Search, Send, Server, Settings, Share2, Shield, ShoppingBag, SlidersHorizontal, Smartphone, Sparkles, Star, Sun, Tag, Target, ThumbsUp, ToggleLeft, Trash2, TrendingUp, Trophy, Truck, Tv, Unlock, Upload, User, UserPlus, Users, Video, Volume2, Wallet, Wifi, Wrench, X, XCircle, Zap, ZoomIn, ZoomOut, Accessibility, Anchor, Aperture, BadgeAlert, BarChart4, Boxes, CalendarCheck, CircleUserRound, ClipboardCheck, CloudCog, Cpu, Crosshair, Crown, DoorOpen, DownloadCloud, ExternalLink, FileArchive, FileCode2, FileCog, Fingerprint, FolderCog, GaugeCircle, Globe2, Hand, KeySquare, ListChecks, LocateFixed, Map, Medal, Network, Package, PanelsTopLeft, PencilLine, PieChart, QrCode, ScanLine, ShieldCheck, Sparkle, SquareActivity, Stethoscope, SunMedium, Table2, Ticket, Timer, TrafficCone, Waypoints, type LucideIcon,
} from "lucide-react";
import { newChart, newIcon, newImage, newQuiz, useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ShapesPanel } from "./ShapesPanel";

type ElementSection = "shapes" | "icons" | null;

const ICONS: Array<{ label: string; Icon: LucideIcon }> = [
  ["Activity", Activity], ["Airplay", Airplay], ["Alarm Clock", AlarmClock], ["Alert Circle", AlertCircle], ["Archive", Archive], ["Calendar Clock", CalendarClock], ["Circle Alert", CircleAlert], ["Circle Dot", CircleDot], ["Cloud Download", CloudDownload], ["File Plus", FilePlus], ["Folder Plus", FolderPlus], ["Git Commit", GitCommit], ["List Filter", ListFilter], ["Message Square", MessageSquare], ["Move", Move], ["Palette", Palette], ["Pen Tool", PenTool], ["Rotate Ccw", RotateCcw], ["Scan", Scan], ["Shield Alert", ShieldAlert], ["Smile", Smile], ["Square Check", SquareCheck], ["Tags", Tags], ["User Round", UserRound], ["Wand Sparkles", WandSparkles], ["Workflow", Workflow], ["Wifi Off", WifiOff], ["Accessibility", Accessibility], ["Anchor", Anchor], ["Aperture", Aperture], ["Badge Alert", BadgeAlert], ["Bar Chart 4", BarChart4], ["Boxes", Boxes], ["Calendar Check", CalendarCheck], ["Circle User", CircleUserRound], ["Clipboard Check", ClipboardCheck], ["Cloud Cog", CloudCog], ["Cpu", Cpu], ["Crosshair", Crosshair], ["Crown", Crown], ["Door Open", DoorOpen], ["Download Cloud", DownloadCloud], ["External Link", ExternalLink], ["File Archive", FileArchive], ["File Code", FileCode2], ["File Cog", FileCog], ["Fingerprint", Fingerprint], ["Folder Cog", FolderCog], ["Gauge Circle", GaugeCircle], ["Globe 2", Globe2], ["Hand", Hand], ["Key Square", KeySquare], ["List Checks", ListChecks], ["Locate Fixed", LocateFixed], ["Map", Map], ["Medal", Medal], ["Network", Network], ["Package", Package], ["Panels Top Left", PanelsTopLeft], ["Pencil Line", PencilLine], ["Pie Chart", PieChart], ["QR Code", QrCode], ["Scan Line", ScanLine], ["Shield Check", ShieldCheck], ["Sparkle", Sparkle], ["Square Activity", SquareActivity], ["Stethoscope", Stethoscope], ["Sun Medium", SunMedium], ["Arrow Down", ArrowDown], ["Arrow Down Circle", ArrowDownCircle], ["Arrow Left", ArrowLeft], ["Arrow Left Circle", ArrowLeftCircle], ["Arrow Right", ArrowRight], ["Arrow Right Circle", ArrowRightCircle], ["Arrow Up", ArrowUp], ["Arrow Up Circle", ArrowUpCircle], ["At Sign", AtSign], ["Award", Award], ["Baby", Baby], ["Badge Check", BadgeCheck], ["Banknote", Banknote], ["Bar Chart", BarChart3], ["Battery", Battery], ["Bell", Bell], ["Bike", Bike], ["Bluetooth", Bluetooth], ["Bold", Bold], ["Book Open", BookOpen], ["Bookmark", Bookmark], ["Box", Box], ["Briefcase", Briefcase], ["Calendar", CalendarDays], ["Camera", Camera], ["Cast", Cast], ["Check", Check], ["Check Circle", CheckCircle2], ["Chevron Down", ChevronDown], ["Chevron Left", ChevronLeft], ["Chevron Right", ChevronRight], ["Chevron Up", ChevronUp], ["Circle", Circle], ["Clipboard", Clipboard], ["Clock", Clock], ["Cloud", Cloud], ["Code", Code], ["Cog", Cog], ["Compass", Compass], ["Copy", Copy], ["Credit Card", CreditCard], ["Database", Database], ["Disc", Disc3], ["Download", Download], ["Edit", Edit3], ["Ellipsis", Ellipsis], ["Eye", Eye], ["File", FileText], ["Film", Film], ["Filter", Filter], ["Flag", Flag], ["Flame", Flame], ["Folder", Folder], ["Folder Open", FolderOpen], ["Gauge", Gauge], ["Gift", Gift], ["Git Branch", GitBranch], ["Github", Github], ["Globe", Globe], ["Grid", Grid2X2], ["Hard Drive", HardDrive], ["Hash", Hash], ["Headphones", Headphones], ["Heart", Heart], ["Help", HelpCircle], ["Home", Home], ["Inbox", Inbox], ["Info", Info], ["Key", KeyRound], ["Laptop", Laptop], ["Layers", Layers], ["Dashboard", LayoutDashboard], ["Lightbulb", Lightbulb], ["Link", Link], ["List", List], ["Lock", Lock], ["Log In", LogIn], ["Log Out", LogOut], ["Mail", Mail], ["Map Pin", MapPin], ["Maximize", Maximize2], ["Menu", Menu], ["Message", MessageCircle], ["Mic", Mic], ["Minus", Minus], ["Monitor", Monitor], ["Moon", Moon], ["Mouse Pointer", MousePointer2], ["Music", Music], ["Navigation", Navigation], ["Paperclip", Paperclip], ["Pause", Pause], ["Pencil", Pencil], ["Phone", Phone], ["Pin", Pin], ["Play", Play], ["Plus", Plus], ["Printer", Printer], ["Refresh", RefreshCw], ["Rocket", Rocket], ["Save", Save], ["Search", Search], ["Send", Send], ["Server", Server], ["Settings", Settings], ["Share", Share2], ["Shield", Shield], ["Shopping Bag", ShoppingBag], ["Sliders", SlidersHorizontal], ["Smartphone", Smartphone], ["Sparkles", Sparkles], ["Star", Star], ["Sun", Sun], ["Tag", Tag], ["Target", Target], ["Thumbs Up", ThumbsUp], ["Trash", Trash2], ["Trending", TrendingUp], ["Trophy", Trophy], ["Truck", Truck], ["Tv", Tv], ["Unlock", Unlock], ["User", User], ["User Plus", UserPlus], ["Users", Users], ["Video", Video], ["Volume", Volume2], ["Wallet", Wallet], ["Wifi", Wifi], ["Wrench", Wrench], ["Close", X], ["Close Circle", XCircle], ["Zap", Zap], ["Zoom In", ZoomIn], ["Zoom Out", ZoomOut],
].map(([label, Icon]) => ({ label: label as string, Icon: Icon as LucideIcon }));

export function ElementsPanel() {
  const { add } = useEditor();
  const [section, setSection] = useState<ElementSection>(null);
  const [iconQuery, setIconQuery] = useState("");
  const filteredIcons = ICONS.filter(({ label }) => label.toLowerCase().includes(iconQuery.trim().toLowerCase()));
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    files.forEach((file) => add(newImage(URL.createObjectURL(file))));
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Elements" />
      <div className="grid grid-cols-3 gap-2">
        <label className="brutal-border-2 brutal-press flex h-20 cursor-pointer flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <Upload className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Upload</span>
          <input type="file" accept="image/*" multiple onChange={onFile} className="hidden" />
        </label>
        <button onClick={() => setSection(section === "shapes" ? null : "shapes")} className={`brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 ${section === "shapes" ? "border-teal bg-blue-deep" : "bg-surface"} text-teal hover:border-teal`}>
          <Shapes className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Shapes</span>
        </button>
        <button onClick={() => setSection(section === "icons" ? null : "icons")} className={`brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 ${section === "icons" ? "border-teal bg-blue-deep" : "bg-surface"} text-teal hover:border-teal`}>
          <Star className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Icons</span>
        </button>
        <button onClick={() => add(newChart("bar"))} title="Add chart" className="brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <BarChart3 className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Chart</span>
        </button>
        <button onClick={() => add(newChart("line"))} title="Add graph" className="brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <TrendingUp className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Graph</span>
        </button>
        <button onClick={() => add(newQuiz())} title="Add quiz" className="brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <HelpCircle className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Quiz</span>
        </button>
      </div>

      {section === "shapes" && <ShapesPanel embedded />}
      {section === "icons" && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-teal/20 bg-surface px-3 py-2 text-teal/70">
            <Search className="size-4" />
            <input value={iconQuery} onChange={(event) => setIconQuery(event.target.value)} placeholder="Search 100+ icons" aria-label="Search icons" className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-teal outline-none placeholder:text-teal/45" />
          </label>
          <div className="grid grid-cols-3 gap-2">
          {filteredIcons.map(({ label, Icon }) => (
            <button key={label} title={`Add ${label}`} onClick={() => add(newIcon(label))} className="brutal-press flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-teal/20 bg-surface text-teal transition-colors hover:border-teal hover:bg-surface-2">
              <Icon className="size-7" strokeWidth={2} />
              <span className="truncate px-1 font-mono text-[8px] text-ink/70">{label}</span>
            </button>
          ))}
          </div>
        </div>
      )}

      {section === null && (
        <div className="flex items-center gap-2 border border-teal/20 bg-surface p-3 font-mono text-[9px] text-teal/50">
          <ImagePlus className="size-4" /> Choose a category above
        </div>
      )}
    </div>
  );
}
