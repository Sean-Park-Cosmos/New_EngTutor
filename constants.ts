import { Scenario, EnglishLevel } from './types';
import { Briefcase, Coffee, GraduationCap, Plane, Users, HeartPulse, Lightbulb } from 'lucide-react';

export const LEVELS = [EnglishLevel.INTERMEDIATE, EnglishLevel.ADVANCED];

export const SCENARIOS: Scenario[] = [
  {
    id: 'business',
    title: 'Business Meeting',
    titleKr: '비즈니스 미팅',
    icon: 'Briefcase',
    description: 'Negotiations, updates, and professional discourse.',
    systemPromptContext: 'You are a colleague in a formal business meeting. Discuss project timelines, budget negotiations, or strategic planning.'
  },
  {
    id: 'daily',
    title: 'Daily Life',
    titleKr: '일상 생활',
    icon: 'Coffee',
    description: 'Ordering food, asking for directions, small talk.',
    systemPromptContext: 'You are a barista, a passerby, or a friend. Engage in casual, everyday conversation.'
  },
  {
    id: 'travel',
    title: 'Travel & Airport',
    titleKr: '여행 및 공항',
    icon: 'Plane',
    description: 'Check-in, customs, asking for recommendations.',
    systemPromptContext: 'You are an airport official, hotel concierge, or local guide. Help with travel logistics and recommendations.'
  },
  {
    id: 'academic',
    title: 'Academic Discussion',
    titleKr: '학술 토론',
    icon: 'GraduationCap',
    description: 'University lectures, seminars, and research.',
    systemPromptContext: 'You are a professor or fellow student. Discuss research findings, theories, or assignments.'
  },
  {
    id: 'social',
    title: 'Social Gathering',
    titleKr: '사교 모임',
    icon: 'Users',
    description: 'Parties, networking events, meeting new people.',
    systemPromptContext: 'You are meeting someone for the first time at a party. Make polite conversation and find common interests.'
  },
  {
    id: 'medical',
    title: 'Medical & Health',
    titleKr: '병원 및 건강',
    icon: 'HeartPulse',
    description: 'Doctor visits, pharmacy, explaining symptoms.',
    systemPromptContext: 'You are a doctor or pharmacist. Ask about symptoms and provide medical advice.'
  }
];

export const ICON_MAP: Record<string, any> = {
  Briefcase,
  Coffee,
  Plane,
  GraduationCap,
  Users,
  HeartPulse,
  Lightbulb
};