import React from "react";
import Header from "./components/header";
import Footer from "./components/footer";
const Layout = ({children}: {children: React.ReactNode})=>{
	return(
		<div className="flex flex-col min-h-screen">
			<Header/>
			<main className="flex-grow container mx-auto px-4 py-6">
				{children}
			</main>
			<Footer/>
		</div>
	);
}
export default Layout;