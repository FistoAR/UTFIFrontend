import footerImage from "../assets/images/footer-image.webp";

export default function Footer() {
  return (
    <div className="w-full">
      <img
        src={footerImage}
        alt="footer"
        className="w-full object-cover"
      />
    </div>
  );
}