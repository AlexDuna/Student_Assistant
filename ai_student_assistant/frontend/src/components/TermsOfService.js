import React from "react";
import "./LegalPage.css";
import Navbar from "./Navbar";

const TermsOfService= () => (
    <div className="dashboard-container">
    <Navbar />
    <div className="legal-page">
        <h1>Terms of Service</h1>
        <p><strong>Effective Date:</strong>June 13, 2025</p>
        <p>Welcome to Fallnik! By using our service, you agree to these Terms:</p>
        <ul>
            <li><strong>Account: </strong>You are responsible for keeping your account details secure.</li>
            <li><strong>Usage: </strong>Do not use Fallnik for illegal activities.</li>
            <li><strong>Spotify: </strong>If you connect Spotify, you agree to Spotify's terms as well. We only access the data needed for Fallnik's features.</li>
            <li><strong>Data: </strong>We do not share your personal data or Spotify information with third parties.</li>
            <li><strong>Termination: </strong>We can suspend accounts that break our rules.</li>
            <li><strong>Liability: </strong>Fallnik is provided as-is, with no guarantee it will be error-free or always available.</li>
            <li><strong>Contact: </strong>Questions? Email us at <a href="mailto:contact@fallnik.com">micalex607@gmail.com</a></li>
        </ul>
        </div>
        </div>
);

export default TermsOfService;