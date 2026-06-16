import { Listing, ListingImage, User, Category, Condition, ListingStatus } from '@prisma/client';

export type ListingWithDetails = Listing & {
  images: ListingImage[];
  user: Pick<User, 'id' | 'name' | 'image' | 'rating' | 'ratingCount'>;
  category: Category;
  _count?: { conversations: number };
};

export type ListingCardData = {
  id: string;
  title: string;
  price: number;
  currency: string;
  city: string;
  province: string;
  condition: Condition;
  status: ListingStatus;
  createdAt: Date;
  images: { url: string }[];
  user: { name: string | null; image: string | null };
  category: { name: string; slug: string };
};

export type MessageWithSender = {
  id: string;
  body: string;
  read: boolean;
  createdAt: Date;
  senderId: string;
  sender: Pick<User, 'id' | 'name' | 'image'>;
};

export type ConversationWithDetails = {
  id: string;
  listingId: string;
  listing: Pick<Listing, 'id' | 'title' | 'price'> & { images: ListingImage[] };
  participants: Pick<User, 'id' | 'name' | 'image'>[];
  messages: MessageWithSender[];
  updatedAt: Date;
};

export interface SearchFilters {
  q?: string;
  category?: string;
  city?: string;
  province?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: Condition;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'nearest';
  lat?: number;
  lng?: number;
  radius?: number; // km
  page?: number;
  limit?: number;
}
