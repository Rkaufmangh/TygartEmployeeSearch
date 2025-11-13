
const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white mt-16 py-16 ">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p>&copy; {new Date().getFullYear()} Tygart Technology Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;