import React from 'react';
import './StartPage.css';
import { Link } from 'react-router-dom';
import HelloMessage from '../components/HelloMessage';

const StartPage = () => {
    return (
        <div className="gradient-bg">
      <svg>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" mode="matrix"
            values="1 0 0 0 0  
                    0 1 0 0 0  
                    0 0 1 0 0  
                    0 0 0 20 -10" 
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>

      <div className="gradients-container">
        <div className="g1"></div>
        <div className="g2"></div>
        <div className="g3"></div>
        <div className="g4"></div>
        <div className="g5"></div>
      </div>
            <div className="start-layout">
                <div className="content-wrapper">
                    <div className="text-section">
                        <h1>Welcome to Fallnik</h1>
                        <p>Platforma ta inteligentă de asistență academică.</p>
                        <HelloMessage />
                        <Link to="/login">
                            <button className="button" size="lg">Join Now</button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StartPage;
