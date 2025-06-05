import { Outlet } from 'react-router-dom';
import MiniPlayer from '../components/MiniPlayer';
import { MusicPlayerProvider } from '../utils/MusicPlayerContext';

const DashboardLayout = () => {
  return (
    <MusicPlayerProvider>
      <Outlet />
      <MiniPlayer />
    </MusicPlayerProvider>
  );
};

export default DashboardLayout;
