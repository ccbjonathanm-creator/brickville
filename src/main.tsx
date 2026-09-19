import { createRoot } from 'react-dom/client';
import { Brickville } from './game/Brickville';
import './styles.css';

createRoot(document.getElementById('app')!).render(<Brickville />);
