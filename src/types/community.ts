export type RideDifficulty = "Beginner Friendly" | "Intermediate" | "Scenic";

export interface Ride {
  title: string;
  location: string;
  distance: string;
  difficulty: RideDifficulty;
  when: string;
  ridersGoing: number;
  month?: string;
  day?: string;
}

export interface Road {
  name: string;
  distance: string;
  difficulty: RideDifficulty;
  scenicRating: string;
  imageLabel: string;
  rating?: string;
}

export interface CommunityStat {
  label: string;
  value: string;
  delta?: string;
}

export interface ActivityItem {
  id: string;
  summary: string;
  when: string;
}

export interface Member {
  id: string;
  name: string;
  motorcycle: string;
  yearsRiding: number;
  location: string;
  avatar: string;
  joined?: string;
  ridesCompleted?: number;
  favoriteRoad?: string;
  bio?: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  distance: string;
  details: string;
  level: RideDifficulty;
  ridersGoing: number;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface JoinBenefit {
  title: string;
  description: string;
}

export interface GarageBike {
  id: string;
  name: string;
  make: string;
  year: string;
  type: string;
  owner: string;
  engineType: string;
  enginePower: string;
  displacement: string;
  boreStroke: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  excerpt: string;
  body: string[];
  pullQuote?: string;
  tags: string[];
}
