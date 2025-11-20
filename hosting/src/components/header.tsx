import React, { useContext, useMemo } from 'react';
import { AuthContext } from '../logic/AuthContext';
import backgroundHeadImg from '../assets/tygart_logo.jpg';
import { useNavigate, Link } from 'react-router-dom';
import { Menu } from '@progress/kendo-react-layout';

const Header = () => {
	const context = useContext<AuthContext | null>(AuthContext);
	
    const navigate = useNavigate();

    const items = useMemo(() => {
        if (!context?.currentUser) {
            return [
                { text: 'Home', data: { path: '/' } },
                { text: 'Sign In', data: { path: '/login' } }
            ];
        }
        const base: any[] = [
            { text: `Welcome, ${context.currentUser?.displayName || ''}`, data: { path: '/profile' } },
            { text: 'Home', data: { path: '/' } }
        ];
        if (context.isAdmin) {
            base.push(
                { text: 'Users', data: { path: '/users' }, items: [ { text: 'Add User', data: { path: '/users/add' } } ] },
                { text: 'Employees', data: { path: '/employees' }, items: [ { text: 'Add Employee', data: { path: '/addemployee' } } ] }
            );
        }
        base.push({ text: 'Sign Out', data: { path: '/signout' } });
        return base;
    }, [context?.currentUser, context?.isAdmin]);

    const onSelect = (e: any) => {
        const path = e.item?.data?.path;
        if (path) navigate(path);
    };

    return (
        <header className="" >

				<nav className="navbar navbar-expand-lg navbar-light bg-light">
					<div className="container-fluid" style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
						<div style={{ backgroundImage: `url(${backgroundHeadImg})`, backgroundRepeat: 'no-repeat', height: '12vh', width: '40vw' }} />
						<div style={{ minWidth: 300 }}>
							<Menu items={items as any} onSelect={onSelect} />
						</div>
					</div>
				</nav>
		</header >
	);
};

export default Header;
