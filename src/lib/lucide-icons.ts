import type { LucideIcon } from "lucide-react";
import { Accessibility, Activity, Airplay, AlignCenterHorizontal, AlignStartHorizontal, AlignEndHorizontal, Anchor, Apple, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Asterisk, Atom, AtSign, Award, BadgeAlert, BadgeCheck, Ban, Battery, Bell, Bike, Bird, Blocks, Bluetooth, Bookmark, BookMarked, BookOpen, Box, Brain, Briefcase, Bug, Building2, Bus, Cake, Calendar, CalendarCheck, Camera, Car, Check, CheckCheck, Cherry, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, CircleDashed, CircleQuestionMark, CircleUserRound, CircleAlert, TriangleAlert, CircleCheck, CircleX, Clapperboard, Clipboard, Clock, Clock3, Cloud, CloudCog, CloudSun, CloudDownload, Code, CodeXml, Coffee, Cog, Columns3, Combine, Command, Compass, Contact, Cookie, Copy, Cpu, CreditCard, Croissant, Crown, Database, Diamond, Disc3, DollarSign, Download, Dumbbell, Pencil, Ellipsis, ExternalLink, Eye, EyeOff, Feather, File, FileChartColumn, FileCheck, FilePlus, FileText, Funnel, Fish, Flag, Flame, Flower2, Folder, FolderGit2, FolderOpen, Gauge, Ghost, Gift, Globe, Earth, Grid2x2, Guitar, Hammer, Hand, Hash, Headphones, Heart, Highlighter, History, House, Hourglass, Image, Inbox, Infinity, Info, Kanban, Key, Keyboard, Laptop, Layers, LayoutPanelLeft, LayoutDashboard, Leaf, Lightbulb, Link, Link2, List, ListChecks, ListTree, Locate, Lock, LockOpen, LogIn, LogOut, Magnet, Mail, Map, MapPin, Medal, Megaphone, Menu, MessageCircle, MessageCircleMore, MessageSquare, MessagesSquare, Mic, Microscope, Milestone, Minus, Monitor, MonitorPlay, Moon, Mouse, Music, Navigation, Orbit, Package, PackageCheck, Paintbrush, Palette, PanelLeft, PanelLeftOpen, PanelsTopLeft, Paperclip, Pause, PawPrint, Pen, PenTool, Phone, PiggyBank, Pin, Plane, Sprout, Play, Plus, Podcast, Pointer, Popcorn, Printer, Puzzle, QrCode, Quote, Radar, Receipt, Recycle, RefreshCw, Rocket, Route, Sailboat, Save, Scale, ScanLine, ScanSearch, Search, Send, SendHorizontal, Server, Settings, Share2, Shield, ShieldCheck, Shirt, ShoppingCart, Sigma, SlidersHorizontal, Snowflake, Sparkles, SquareDashedKanban, SquareStack, Stamp, Star, Store, Sun, SunMoon, Table2, Tablet, Tag, Telescope, Tent, Terminal, ThumbsUp, Ticket, Timer, ToggleLeft, ToolCase, TrainFront, Trash2, Trees, Truck, Tv, Twitter, Umbrella, Upload, User, UserCheck, UserPlus, Users, Video, Volleyball, WalletCards, Wand, Watch, Waves, Waypoints, Wifi, Wind, Workflow, Wrench, X, Zap, ZoomIn, ZoomOut, ChartLine, ChartPie, ChartNoAxesCombined, ChartColumnBig } from "lucide-react";

/**
 * Explicit icon index for the editor.
 * Every component below is imported by name (verified against the pinned
 * lucide-react 0.575.0 exports) so the bundle always contains real icon
 * components — no runtime namespace lookup that can fail silently.
 */
export const LUCIDE_ICONS: Record<string, LucideIcon> = { Accessibility, Activity, Airplay, AlignCenterHorizontal, AlignStartHorizontal, AlignEndHorizontal, Anchor, Apple, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Asterisk, Atom, AtSign, Award, BadgeAlert, BadgeCheck, Ban, Battery, Bell, Bike, Bird, Blocks, Bluetooth, Bookmark, BookMarked, BookOpen, Box, Brain, Briefcase, Bug, Building2, Bus, Cake, Calendar, CalendarCheck, Camera, Car, Check, CheckCheck, Cherry, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, CircleDashed, CircleQuestionMark, CircleUserRound, CircleAlert, TriangleAlert, CircleCheck, CircleX, Clapperboard, Clipboard, Clock, Clock3, Cloud, CloudCog, CloudSun, CloudDownload, Code, CodeXml, Coffee, Cog, Columns3, Combine, Command, Compass, Contact, Cookie, Copy, Cpu, CreditCard, Croissant, Crown, Database, Diamond, Disc3, DollarSign, Download, Dumbbell, Pencil, Ellipsis, ExternalLink, Eye, EyeOff, Feather, File, FileChartColumn, FileCheck, FilePlus, FileText, Funnel, Fish, Flag, Flame, Flower2, Folder, FolderGit2, FolderOpen, Gauge, Ghost, Gift, Globe, Earth, Grid2x2, Guitar, Hammer, Hand, Hash, Headphones, Heart, Highlighter, History, House, Hourglass, Image, Inbox, Infinity, Info, Kanban, Key, Keyboard, Laptop, Layers, LayoutPanelLeft, LayoutDashboard, Leaf, Lightbulb, Link, Link2, List, ListChecks, ListTree, Locate, Lock, LockOpen, LogIn, LogOut, Magnet, Mail, Map, MapPin, Medal, Megaphone, Menu, MessageCircle, MessageCircleMore, MessageSquare, MessagesSquare, Mic, Microscope, Milestone, Minus, Monitor, MonitorPlay, Moon, Mouse, Music, Navigation, Orbit, Package, PackageCheck, Paintbrush, Palette, PanelLeft, PanelLeftOpen, PanelsTopLeft, Paperclip, Pause, PawPrint, Pen, PenTool, Phone, PiggyBank, Pin, Plane, Sprout, Play, Plus, Podcast, Pointer, Popcorn, Printer, Puzzle, QrCode, Quote, Radar, Receipt, Recycle, RefreshCw, Rocket, Route, Sailboat, Save, Scale, ScanLine, ScanSearch, Search, Send, SendHorizontal, Server, Settings, Share2, Shield, ShieldCheck, Shirt, ShoppingCart, Sigma, SlidersHorizontal, Snowflake, Sparkles, SquareDashedKanban, SquareStack, Stamp, Star, Store, Sun, SunMoon, Table2, Tablet, Tag, Telescope, Tent, Terminal, ThumbsUp, Ticket, Timer, ToggleLeft, ToolCase, TrainFront, Trash2, Trees, Truck, Tv, Twitter, Umbrella, Upload, User, UserCheck, UserPlus, Users, Video, Volleyball, WalletCards, Wand, Watch, Waves, Waypoints, Wifi, Wind, Workflow, Wrench, X, Zap, ZoomIn, ZoomOut, ChartLine, ChartPie, ChartNoAxesCombined, ChartColumnBig };

/** Old storage names -> modern component, so slides created before the renames keep rendering. */
const LEGACY_ICON_ALIASES: Record<string, LucideIcon> = {
  AlertCircle: CircleAlert,
  AlertTriangle: TriangleAlert,
  AlignCenter: AlignCenterHorizontal,
  AlignLeft: AlignStartHorizontal,
  AlignRight: AlignEndHorizontal,
  BarChart3: ChartColumnBig,
  Boat: Sailboat,
  CheckCircle: CircleCheck,
  Code2: CodeXml,
  DownloadCloud: CloudDownload,
  Edit: Pencil,
  FilePlus2: FilePlus,
  Filter: Funnel,
  Globe2: Earth,
  Grid2X2: Grid2x2,
  HelpCircle: CircleQuestionMark,
  Home: House,
  Layout: LayoutPanelLeft,
  MoreHorizontal: Ellipsis,
  Plant: Sprout,
  Sidebar: PanelLeftOpen,
  Unlock: LockOpen,
  XCircle: CircleX,
};

for (const [alias, icon] of Object.entries(LEGACY_ICON_ALIASES)) {
  if (!LUCIDE_ICONS[alias]) LUCIDE_ICONS[alias] = icon;
}
