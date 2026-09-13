import "./globals.css";

export const metadata = {
  title: "About This Much: Healthy Habits",
  description: "Six habits, no math required.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/2.44.0/iconfont/tabler-icons.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
