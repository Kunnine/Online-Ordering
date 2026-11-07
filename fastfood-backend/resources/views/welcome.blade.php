<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FastFood Admin</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="app">
        <h1>FastFood Dashboard</h1>
        <div id="stats">
            Loading stats...
        </div>
    </div>

    <script>
        window.Echo = window.Echo || {};
        // Listen for order status updates
        window.Echo.channel('order-updates')
            .listen('OrderStatusUpdated', (event) => {
                console.log('Order status updated:', event);
                // Update UI or refresh stats
                window.location.reload();
            });
    </script>
</body>
</html>