import {
  Sparkles, Zap, Building2, Factory, Wind, Droplets, Droplet, PaintRoller, Shield, Trees,
  Car, HeartHandshake, Wheat, Recycle, Wrench, MapPin, Phone, Mail, User, Clock, CheckCircle2,
  Circle, AlertCircle, Star, Send, Mic, Camera, Upload, ArrowRight, ArrowLeft, ArrowUpRight,
  Menu, X, Globe, Settings, Users, Briefcase, TrendingUp, Bell, LogOut, ChevronLeft, ChevronRight,
  ChevronDown, Loader2, Plus, Pencil, Trash2, Eye, EyeOff, Ban, Printer, Filter, Package,
  Calendar, Navigation, ThumbsUp, MessageSquare, Info, BadgeCheck, ShieldCheck, Bot, Activity,
  RefreshCw, Image, ImageOff, Lock, CreditCard, Banknote, Check, Apple, Wallet, BellRing, AlertTriangle,
  Crown, Gem, Layers, Link2, Sparkle, Tag, Gift, Repeat, UserCircle2, Save,
  Truck, PlayCircle, Flag, Volume2,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

const map: Record<string, ComponentType<LucideProps>> = {
  Sparkles, Zap, Building2, Factory, Wind, Droplets, Droplet, PaintRoller, Shield, Trees,
  Car, HeartHandshake, Wheat, Recycle, Wrench, MapPin, Phone, Mail, User, Clock, CheckCircle2,
  Circle, AlertCircle, Star, Send, Mic, Camera, Upload, ArrowRight, ArrowLeft, ArrowUpRight,
  Menu, X, Globe, Settings, Users, Briefcase, TrendingUp, Bell, LogOut, ChevronLeft, ChevronRight,
  ChevronDown, Loader2, Plus, Pencil, Trash2, Eye, EyeOff, Ban, Printer, Filter, Package,
  Calendar, Navigation, ThumbsUp, MessageSquare, Info, BadgeCheck, ShieldCheck, Bot, Activity,
  RefreshCw, Image, ImageOff, Lock, CreditCard, Banknote, Check, Apple, Wallet, BellRing, AlertTriangle,
  Crown, Gem, Layers, Link2, Sparkle, Tag, Gift, Repeat, UserCircle2, Save,
  Truck, PlayCircle, Flag, Volume2,
};

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const C = map[name] ?? Sparkles;
  return <C {...props} />;
}

export type IconName = keyof typeof map;
