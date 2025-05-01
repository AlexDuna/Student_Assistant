import { useEffect, useState } from "react";

const HelloMessage = () => {
    const [message, setMessage] = useState('');

    useEffect(() =>{
        fetch('/api/hello')
        .then(res => res.json())
        .then(data => setMessage(data.message))
        .catch(error => console.log('Error:', error));
    }, []);

    return(
        <div>
            <h1>{message}</h1>
        </div>
    );
};

export default HelloMessage;