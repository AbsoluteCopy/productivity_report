import { Outlet } from 'react-router-dom';
import Header from './header';

export default function Layout() {
    return (
        <>
            <Header />
            <div className="app-layout">
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </>
    );
}
