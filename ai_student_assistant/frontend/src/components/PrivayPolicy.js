import React from "react";
import "./LegalPage.css";
import Navbar from "./Navbar";

const PrivacyPolicy = () => (
    
    <div className="dashboard-container">
    <Navbar />
    <div className="legal-page">
        <h1>Privacy Policy</h1>
        <p><strong>Effective Date: </strong> June 13, 2025</p>
        <p>Thank you for using Fallnik! This Privacy Policy explains how we collect, use, and protect your information.</p>
        <h2>Information We Collect</h2>
        <ul>
            <li><strong>Account Information: </strong> When you register, we collect your usename and email address.</li>
            <li><strong>Spotify Data: </strong> If you connect your Spotify account, we access the following data:
                <ul>
                    <li>Profile information (name, email, profile image)</li>
                    <li>Your playlists and tracks</li>
                    <li>Playback state (what you are listening to)</li>
                </ul>
            </li>
        </ul>
        <h2>How We Use Your Data</h2>
        <ul>
            <li>To provide personalized study music recommendations and features inside the Fallnik dashboard.</li>
            <li>To show your playlists and allow you to control music playback while you study.</li>
            <li>To improve the quality and experience of Fallnik.</li>
        </ul>
        <h2>How We Protect Your Data</h2>
        <ul>
            <li>We do not share your Spotify data or personal data with any third parties.</li>
            <li>All data is stored securely and only accesible to you after login.</li>
        </ul>
        <h2>Your Rights</h2>
        <ul>
            <li>You can disconnect your Spotify account from Fallnik at any time from your account settings.</li>
            <li>You can request your data to be deleted by contacting us at <a href="mailto:contact@fallnik.com">micalex607@gmail.com</a></li>
        </ul>
        <h2>Cookies</h2>
        <ul>
            <li>We use cookies to keep you logged in and to remember your settings.</li>
        </ul>

        <h2>Contact</h2>
        <ul>
            <li>If you have questions, contact us at <a href="mailto:contact@fallnik.com">micalex607@gmail.com</a></li>
        </ul>
        <p>This Privacy Policy may be updated. We'll notify you of major changes.</p>
    </div>
    </div>
);

export default PrivacyPolicy;