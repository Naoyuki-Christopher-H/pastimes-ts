import jacket from "@/assets/jacket.jpg";
import dress from "@/assets/dress.jpg";
import sneakers from "@/assets/sneakers.jpg";

export type Item = {
  id: string;
  name: string;
  brand: string;
  size: string;
  condition: string;
  price: number;
  seller: string;
  image: string;
};

// Sample listings for the prototype; a real shop would load these from a database.
export const ITEMS: Item[] = [
  { id: "1", name: "Trucker denim jacket", brand: "Levi's", size: "M", condition: "Excellent", price: 650, seller: "thandi_k", image: jacket },
  { id: "2", name: "Floral midi dress", brand: "Zara", size: "S", condition: "Like new", price: 320, seller: "megan.r", image: dress },
  { id: "3", name: "Leather court sneakers", brand: "Common Projects", size: "UK 9", condition: "Good", price: 1450, seller: "sipho_m", image: sneakers },
  { id: "4", name: "Stonewash denim jacket", brand: "Wrangler", size: "L", condition: "Good", price: 480, seller: "jonah.p", image: jacket },
  { id: "5", name: "Garden print sundress", brand: "Woolworths", size: "M", condition: "Excellent", price: 260, seller: "aisha_n", image: dress },
  { id: "6", name: "Minimal white trainers", brand: "Veja", size: "UK 6", condition: "Like new", price: 980, seller: "lerato.d", image: sneakers },
];

export const formatRand = (amount: number) => `R ${amount.toLocaleString("en-ZA")}`;

export type CartLine = { item: Item; qty: number };

export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + line.item.price * line.qty, 0);
