
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
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div style="display: flex; align-items: center; flex-direction: column;">
        <img style="max-width: 100%" src="/assets/emoji.jpg"/>
        <div>You are now authenticated, please close this window</div>
    </div>
</body>
</html>`
}