
export const getCallbackHtml = (token: string) => {
    return`
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Complete</title>
    <script>
        localStorage.setItem('YTHS_ACCESS_TOKEN', '${token}');
        console.log(localStorage.getItem('YTHS_ACCESS_TOKEN'));
    </script>
    <style>
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #000;
            font-family: 'Courier New', monospace;
            overflow: hidden;
            background-image: 
                radial-gradient(circle at 25% 25%, #ff00ff 0%, transparent 20%),
                radial-gradient(circle at 75% 75%, #00ffff 0%, transparent 20%);
            animation: bgPulse 8s infinite alternate;
        }

        .message-container {
            text-align: center;
            padding: 2rem;
            border: 4px solid #00ff00;
            background-color: rgba(0, 0, 0, 0.8);
            box-shadow: 0 0 20px #00ff00,
                        0 0 40px #00ff00,
                        0 0 60px #00ff00;
            max-width: 80%;
            position: relative;
            overflow: hidden;
        }

        .message-container::before {
            content: "";
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border: 2px dashed #ff00ff;
            animation: rotate 20s linear infinite;
            pointer-events: none;
        }

        h1 {
            color: #00ff00;
            font-size: 3rem;
            text-shadow: 0 0 10px #00ff00;
            margin-bottom: 1.5rem;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        p {
            color: #ffffff;
            font-size: 1.5rem;
            margin-bottom: 2rem;
            text-shadow: 0 0 5px #ffffff;
        }

        .close-btn {
            background: none;
            border: 2px solid #ff00ff;
            color: #ff00ff;
            padding: 12px 24px;
            font-size: 1.2rem;
            font-family: 'Courier New', monospace;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .close-btn:hover {
            background: #ff00ff;
            color: #000;
            box-shadow: 0 0 15px #ff00ff;
        }

        .close-btn::before {
            content: "";
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: all 0.5s ease;
        }

        .close-btn:hover::before {
            left: 100%;
        }

        @keyframes bgPulse {
            0% { background-color: #000; }
            100% { background-color: #111; }
        }

        @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Scanlines effect */
        body::after {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
                linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 4px, 4px 100%;
            pointer-events: none;
            z-index: 100;
        }

        /* Glitch effect */
        .glitch {
            position: relative;
        }

        .glitch::before, .glitch::after {
            content: attr(data-text);
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.8;
        }

        .glitch::before {
            color: #0ff;
            z-index: -1;
            animation: glitch-effect 3s infinite;
        }

        .glitch::after {
            color: #f0f;
            z-index: -2;
            animation: glitch-effect 2s infinite reverse;
        }

        @keyframes glitch-effect {
            0% { transform: translate(0); }
            20% { transform: translate(-3px, 3px); }
            40% { transform: translate(-3px, -3px); }
            60% { transform: translate(3px, 3px); }
            80% { transform: translate(3px, -3px); }
            100% { transform: translate(0); }
        }
    </style>
</head>
<body>
    <div class="message-container">
        <h1 class="glitch" data-text="ACCESS GRANTED">ACCESS GRANTED</h1>
        <h1>I HAVE BEEN RESTRICTED FROM OFFERING YOU THE PLEASURE OF CLOSING THIS WINDOW FOR YOU. IF YOU THINK THIS ISN'T RIGHT THEN PLEASE CONTACT GOOGLE </h1>
        <button class="close-btn" onclick="window.close()">CLOSE WINDOW</button>
        <iframe style="max-width: 600px; width: 100%; height: 400px;" src="https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-window-close" />        
    </div>
</body>
</html>`
}