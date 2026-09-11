import "./globals.css";

export const metadata = {
  title: "About This Much",
  description: "Six habits, no math required.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
