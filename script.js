class SmartTransitTracker {
    constructor() {
        this.userLocation = null;
        this.locationWatchId = null;
        this.transitStops = [];
        this.canvas = document.getElementById('transitMap');
        this.ctx = this.canvas.getContext('2d');
        this.backgroundTasksCount = 0;
        this.visibleStopsCount = 0;
        this.dataUsage = 0;
        this.intersectionObserver = null;
        this.backgroundUpdatesEnabled = false;
        this.networkInfo = null;
        this.performanceMonitor = {
            frameRate: 60,
            lastFrameTime: 0,
            frames: 0
        };

        this.init();
    }

    async init() {
        console.log('🚀 Initializing Smart Transit Tracker...');
        
        // Set up canvas
        this.setupCanvas();
        
        // Initialize Web APIs
        await this.initializeAPIs();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start the application
        this.startApp();
    }

    setupCanvas() {
        // Make canvas responsive
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width - 40; // Account for padding
            this.canvas.height = 400;
            this.drawMap();
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    async initializeAPIs() {
        console.log('🔧 Initializing Web APIs...');
        
        // 1. Geolocation API
        await this.initGeolocation();
        
        // 2. Network Information API
        this.initNetworkInfo();
        
        // 3. Intersection Observer API
        this.initIntersectionObserver();
        
        // 4. Background Tasks API
        this.initBackgroundTasks();
        
        // 5. Canvas API is initialized with setupCanvas()
    }

    async initGeolocation() {
        console.log('📍 Initializing Geolocation API...');
        
        if (!navigator.geolocation) {
            this.updateStatus('location', 'error', 'Geolocation not supported');
            this.showLocationError('Your browser doesn\'t support geolocation');
            return;
        }

        // Check permission status first
        if (navigator.permissions) {
            try {
                const permission = await navigator.permissions.query({ name: 'geolocation' });
                console.log('📍 Geolocation permission status:', permission.state);
                
                permission.onchange = () => {
                    console.log('📍 Permission changed to:', permission.state);
                    if (permission.state === 'granted') {
                        this.getCurrentLocation();
                    } else if (permission.state === 'denied') {
                        this.handleLocationDenied();
                    }
                };
            } catch (error) {
                console.log('📍 Permission API not supported, proceeding with location request');
            }
        }

        await this.getCurrentLocation();
    }

    async getCurrentLocation() {
        this.updateStatus('location', 'warning', 'Location: Requesting permission...');
        
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000 // 5 minutes
        };

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, options);
            });

            this.userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
            };

            this.updateStatus('location', 'success', `Location: ${this.userLocation.lat.toFixed(4)}, ${this.userLocation.lng.toFixed(4)}`);
            console.log('✅ Geolocation acquired:', this.userLocation);
            
            // Enable location tracking
            this.startLocationTracking();
            
            // Update UI to show location is active
            this.showLocationSuccess();
            
        } catch (error) {
            this.handleLocationError(error);
        }
    }

    handleLocationError(error) {
        console.error('❌ Geolocation error:', error);
        
        let errorMessage = 'Location access failed';
        let statusType = 'error';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Location access denied by user';
                this.handleLocationDenied();
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable';
                statusType = 'warning';
                break;
            case error.TIMEOUT:
                errorMessage = 'Location request timed out';
                statusType = 'warning';
                break;
            default:
                errorMessage = 'Unknown location error';
                break;
        }
        
        this.updateStatus('location', statusType, errorMessage);
        this.showLocationError(errorMessage);
        
        // Use default location (Mumbai, India - user's region)
        this.userLocation = { 
            lat: 19.0760, 
            lng: 72.8777,
            accuracy: null,
            timestamp: Date.now(),
            isDefault: true
        };
        
        console.log('📍 Using default location (Mumbai):', this.userLocation);
    }

    handleLocationDenied() {
        this.showLocationPermissionDialog();
    }

    startLocationTracking() {
        // Watch position for real-time updates
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
        }
        
        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                
                // Check if location has changed significantly
                if (this.hasLocationChanged(newLocation)) {
                    console.log('📍 Location updated:', newLocation);
                    this.userLocation = newLocation;
                    this.updateStatus('location', 'success', `Location: ${this.userLocation.lat.toFixed(4)}, ${this.userLocation.lng.toFixed(4)}`);
                    
                    // Update transit data and map
                    this.scheduleBackgroundTask(() => {
                        this.generateTransitData();
                        this.drawMap();
                    });
                }
            },
            (error) => {
                console.log('📍 Location tracking error:', error);
                // Don't show error for tracking, just log it
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000 // 1 minute
            }
        );
    }

    hasLocationChanged(newLocation) {
        if (!this.userLocation) return true;
        
        const distance = this.calculateDistance(
            this.userLocation.lat, this.userLocation.lng,
            newLocation.lat, newLocation.lng
        );
        
        // Update if moved more than 50 meters
        return distance > 50;
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                 Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    showLocationSuccess() {
        // Add visual feedback for successful location access
        const locationBtn = document.getElementById('centerBtn');
        locationBtn.innerHTML = '📍 Location Active';
        locationBtn.style.background = '#48bb78';
        
        setTimeout(() => {
            locationBtn.innerHTML = '📍 Center on Me';
            locationBtn.style.background = '#4299e1';
        }, 3000);
    }

    showLocationError(message) {
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fed7cc;
            color: #c53030;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #f56565;
            max-width: 300px;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        `;
        errorDiv.innerHTML = `
            <strong>📍 Location Error</strong><br>
            ${message}
            <br><br>
            <button onclick="this.parentElement.remove()" style="
                background: #c53030;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            ">Dismiss</button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    showLocationPermissionDialog() {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;
        
        dialog.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 15px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            ">
                <h3 style="color: #4a5568; margin-bottom: 15px;">📍 Location Access Required</h3>
                <p style="color: #718096; margin-bottom: 20px;">
                    This app needs your location to show nearby transit stops and provide accurate directions.
                </p>
                <div style="margin-bottom: 20px;">
                    <p style="font-size: 14px; color: #a0aec0;">
                        To enable location access:
                    </p>
                    <ol style="text-align: left; margin: 10px 0; padding-left: 20px; font-size: 14px; color: #718096;">
                        <li>Click the location icon in your browser's address bar</li>
                        <li>Select "Allow" for location access</li>
                        <li>Refresh the page</li>
                    </ol>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #4299e1;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: bold;
                    margin-right: 10px;
                ">I'll Enable It</button>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #a0aec0;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: bold;
                ">Use Default Location</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    initNetworkInfo() {
        console.log('📡 Initializing Network Information API...');
        
        if ('connection' in navigator) {
            this.networkInfo = navigator.connection;
            
            const updateNetworkStatus = () => {
                const connection = this.networkInfo;
                const effectiveType = connection.effectiveType || 'unknown';
                const downlink = connection.downlink || 0;
                
                let status = 'success';
                if (effectiveType === 'slow-2g' || effectiveType === '2g') {
                    status = 'error';
                } else if (effectiveType === '3g') {
                    status = 'warning';
                }
                
                this.updateStatus('network', status, `Network: ${effectiveType.toUpperCase()} (${downlink} Mbps)`);
                
                // Adjust data usage based on connection
                this.optimizeForNetwork(effectiveType);
            };
            
            updateNetworkStatus();
            this.networkInfo.addEventListener('change', updateNetworkStatus);
            
        } else {
            this.updateStatus('network', 'warning', 'Network: API not supported');
        }
    }

    initIntersectionObserver() {
        console.log('👁️ Initializing Intersection Observer API...');
        
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        this.visibleStopsCount++;
                    } else {
                        entry.target.classList.remove('visible');
                        this.visibleStopsCount = Math.max(0, this.visibleStopsCount - 1);
                    }
                });
                
                this.updatePerformanceMetrics();
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });
            
            console.log('✅ Intersection Observer ready');
        } else {
            console.log('❌ Intersection Observer not supported');
        }
    }

    initBackgroundTasks() {
        console.log('⚙️ Initializing Background Tasks API...');
        
        if ('requestIdleCallback' in window) {
            console.log('✅ Background Tasks API available');
        } else {
            console.log('❌ Background Tasks API not supported, using setTimeout fallback');
        }
    }

    optimizeForNetwork(effectiveType) {
        console.log('🔧 Optimizing for network:', effectiveType);
        
        switch (effectiveType) {
            case 'slow-2g':
            case '2g':
                // Reduce update frequency and data
                this.updateInterval = 30000; // 30 seconds
                this.maxStops = 5;
                break;
            case '3g':
                this.updateInterval = 15000; // 15 seconds
                this.maxStops = 10;
                break;
            default:
                this.updateInterval = 5000; // 5 seconds
                this.maxStops = 20;
        }
    }

    scheduleBackgroundTask(task, data) {
        this.backgroundTasksCount++;
        this.updatePerformanceMetrics();
        
        const runTask = (deadline) => {
            const startTime = performance.now();
            
            try {
                task(data);
                const endTime = performance.now();
                console.log(`⚡ Background task completed in ${(endTime - startTime).toFixed(2)}ms`);
            } catch (error) {
                console.error('❌ Background task error:', error);
            } finally {
                this.backgroundTasksCount--;
                this.updatePerformanceMetrics();
            }
        };

        if ('requestIdleCallback' in window) {
            requestIdleCallback(runTask, { timeout: 1000 });
        } else {
            setTimeout(() => runTask({ timeRemaining: () => 16 }), 0);
        }
    }

    updateStatus(type, status, text) {
        const statusDot = document.getElementById(`${type}Status`);
        const statusText = document.getElementById(`${type}Text`);
        
        statusDot.className = `status-dot ${status === 'success' ? '' : status}`;
        statusText.textContent = text;
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshTransitData();
        });
        
        document.getElementById('centerBtn').addEventListener('click', () => {
            this.centerMapOnUser();
        });
        
        document.getElementById('optimizeBtn').addEventListener('click', () => {
            this.optimizePerformance();
        });
        
        document.getElementById('backgroundBtn').addEventListener('click', () => {
            this.toggleBackgroundUpdates();
        });
        
        // Canvas interaction
        this.canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });
        
        // Add location request button
        this.addLocationControls();
    }

    addLocationControls() {
        const controls = document.querySelector('.controls');
        
        // Add location request button
        const locationBtn = document.createElement('button');
        locationBtn.className = 'btn';
        locationBtn.innerHTML = '📍 Request Location';
        locationBtn.id = 'requestLocationBtn';
        locationBtn.addEventListener('click', () => {
            this.requestLocationPermission();
        });
        
        // Add location settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'btn';
        settingsBtn.innerHTML = '⚙️ Location Settings';
        settingsBtn.addEventListener('click', () => {
            this.showLocationSettings();
        });
        
        controls.appendChild(locationBtn);
        controls.appendChild(settingsBtn);
    }

    async requestLocationPermission() {
        console.log('📍 Manually requesting location permission...');
        await this.getCurrentLocation();
    }

    showLocationSettings() {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;
        
        const accuracyText = this.userLocation?.accuracy ? 
            `${this.userLocation.accuracy.toFixed(0)}m` : 'Unknown';
        const locationText = this.userLocation?.isDefault ? 
            'Default Location (Mumbai)' : 'GPS Location';
        const lastUpdate = this.userLocation?.timestamp ? 
            new Date(this.userLocation.timestamp).toLocaleString() : 'Never';
        
        dialog.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 15px;
                max-width: 500px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            ">
                <h3 style="color: #4a5568; margin-bottom: 20px;">📍 Location Settings</h3>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #2d3748; margin-bottom: 10px;">Current Location</h4>
                    <p style="color: #718096; font-size: 14px;">
                        <strong>Type:</strong> ${locationText}<br>
                        <strong>Coordinates:</strong> ${this.userLocation?.lat.toFixed(6)}, ${this.userLocation?.lng.toFixed(6)}<br>
                        <strong>Accuracy:</strong> ${accuracyText}<br>
                        <strong>Last Updated:</strong> ${lastUpdate}
                    </p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #2d3748; margin-bottom: 10px;">Location Tracking</h4>
                    <label style="display: flex; align-items: center; color: #718096;">
                        <input type="checkbox" ${this.locationWatchId ? 'checked' : ''} 
                               onchange="window.transitTracker.toggleLocationTracking(this.checked)"
                               style="margin-right: 10px;">
                        Enable continuous location tracking
                    </label>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="window.transitTracker.requestLocationPermission()" style="
                        background: #4299e1;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Refresh Location</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                        background: #a0aec0;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    toggleLocationTracking(enabled) {
        if (enabled) {
            this.startLocationTracking();
        } else {
            this.stopLocationTracking();
        }
    }

    stopLocationTracking() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
            console.log('📍 Location tracking stopped');
        }
    }

    startApp() {
        console.log('🎯 Starting application...');
        
        // Generate initial transit data
        this.generateTransitData();
        
        // Draw initial map
        this.drawMap();
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
        
        // Start background updates if enabled
        if (this.backgroundUpdatesEnabled) {
            this.startBackgroundUpdates();
        }
    }

    generateTransitData() {
        console.log('🚌 Generating transit data...');
        
        if (!this.userLocation) return;
        
        const stops = [];
        const routes = ['Bus 42', 'Metro Blue', 'Bus 18', 'Metro Red', 'Bus 7', 'Express 101'];
        const statuses = ['ontime', 'delayed', 'early'];
        
        for (let i = 0; i < (this.maxStops || 15); i++) {
            const stop = {
                id: i,
                name: `Stop ${i + 1}`,
                route: routes[Math.floor(Math.random() * routes.length)],
                lat: this.userLocation.lat + (Math.random() - 0.5) * 0.02,
                lng: this.userLocation.lng + (Math.random() - 0.5) * 0.02,
                arrivalTime: Math.floor(Math.random() * 30) + 1,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                distance: Math.random() * 2000 + 100
            };
            
            stops.push(stop);
        }
        
        this.transitStops = stops.sort((a, b) => a.distance - b.distance);
        this.displayTransitStops();
        this.simulateDataUsage(stops.length * 0.5); // Simulate 0.5KB per stop
    }

    displayTransitStops() {
        const container = document.getElementById('transitStops');
        container.innerHTML = '';
        
        this.transitStops.forEach(stop => {
            const stopElement = document.createElement('div');
            stopElement.className = 'transit-item';
            stopElement.innerHTML = `
                <div class="transit-route">${stop.route}</div>
                <div class="transit-time">
                    Arrives in ${stop.arrivalTime} min
                    <span class="transit-status status-${stop.status}">${stop.status.toUpperCase()}</span>
                </div>
                <div style="color: #718096; font-size: 0.8em; margin-top: 5px;">
                    ${stop.distance.toFixed(0)}m away • ${stop.name}
                </div>
            `;
            
            container.appendChild(stopElement);
            
            // Add to intersection observer
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(stopElement);
            }
        });
    }

    drawMap() {
        if (!this.ctx || !this.userLocation) return;
        
        const canvas = this.canvas;
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#e6f3ff');
        gradient.addColorStop(1, '#f0f8ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // Draw user location
        const userX = canvas.width / 2;
        const userY = canvas.height / 2;
        
        ctx.fillStyle = '#4299e1';
        ctx.beginPath();
        ctx.arc(userX, userY, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#2b6cb0';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('You', userX, userY + 25);
        
        // Draw transit stops
        this.transitStops.forEach(stop => {
            const x = userX + (stop.lng - this.userLocation.lng) * 10000;
            const y = userY + (stop.lat - this.userLocation.lat) * -10000;
            
            if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                // Draw connection line
                ctx.strokeStyle = '#a0aec0';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(userX, userY);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw stop
                ctx.fillStyle = stop.status === 'ontime' ? '#48bb78' : 
                               stop.status === 'delayed' ? '#f56565' : '#4299e1';
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw stop label
                ctx.fillStyle = '#2d3748';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(stop.route, x, y - 12);
            }
        });
    }

    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

                        console.log(`🖱️ Canvas clicked at: ${x}, ${y}`);
                
                // Check if click is near any transit stop
                const userX = this.canvas.width / 2;
                const userY = this.canvas.height / 2;
                
                this.transitStops.forEach(stop => {
                    const stopX = userX + (stop.lng - this.userLocation.lng) * 10000;
                    const stopY = userY + (stop.lat - this.userLocation.lat) * -10000;
                    
                    const distance = Math.sqrt((x - stopX) ** 2 + (y - stopY) ** 2);
                    if (distance < 20) {
                        this.showStopDetails(stop);
                    }
                });
            }

            showStopDetails(stop) {
                alert(`🚌 ${stop.route}\n📍 ${stop.name}\n⏱️ Arrives in ${stop.arrivalTime} minutes\n📊 Status: ${stop.status.toUpperCase()}\n📏 Distance: ${stop.distance.toFixed(0)}m`);
            }

            refreshTransitData() {
                console.log('🔄 Refreshing transit data...');
                
                this.scheduleBackgroundTask(() => {
                    this.generateTransitData();
                    this.drawMap();
                    this.updatePerformanceMetrics();
                    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
                });
            }

            centerMapOnUser() {
                console.log('📍 Centering map on user...');
                
                if (!this.userLocation) {
                    this.requestLocationPermission();
                    return;
                }
                
                this.drawMap();
                
                // Add visual feedback
                const btn = document.getElementById('centerBtn');
                const originalText = btn.innerHTML;
                btn.innerHTML = '📍 Centered!';
                btn.style.background = '#48bb78';
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '#4299e1';
                }, 2000);
            }

            optimizePerformance() {
                console.log('⚡ Optimizing performance...');
                
                this.scheduleBackgroundTask(() => {
                    // Simulate performance optimization
                    this.transitStops = this.transitStops.slice(0, 10); // Limit stops
                    this.displayTransitStops();
                    this.drawMap();
                    this.updateStatus('performance', 'success', 'Performance: Optimized');
                });
            }

            toggleBackgroundUpdates() {
                this.backgroundUpdatesEnabled = !this.backgroundUpdatesEnabled;
                const btn = document.getElementById('backgroundBtn');
                
                if (this.backgroundUpdatesEnabled) {
                    btn.textContent = '⏸️ Pause Updates';
                    this.startBackgroundUpdates();
                } else {
                    btn.textContent = '🔄 Background Updates';
                    this.stopBackgroundUpdates();
                }
            }

            startBackgroundUpdates() {
                if (this.backgroundUpdateInterval) return;
                
                this.backgroundUpdateInterval = setInterval(() => {
                    this.scheduleBackgroundTask(() => {
                        // Update transit times
                        this.transitStops.forEach(stop => {
                            stop.arrivalTime = Math.max(1, stop.arrivalTime - 1);
                        });
                        
                        this.displayTransitStops();
                        this.simulateDataUsage(0.1); // Small update
                    });
                }, this.updateInterval || 5000);
            }

            stopBackgroundUpdates() {
                if (this.backgroundUpdateInterval) {
                    clearInterval(this.backgroundUpdateInterval);
                    this.backgroundUpdateInterval = null;
                }
            }

            startPerformanceMonitoring() {
                const monitorFrame = () => {
                    const now = performance.now();
                    
                    if (this.performanceMonitor.lastFrameTime) {
                        const delta = now - this.performanceMonitor.lastFrameTime;
                        this.performanceMonitor.frameRate = 1000 / delta;
                    }
                    
                    this.performanceMonitor.lastFrameTime = now;
                    this.performanceMonitor.frames++;
                    
                    // Update performance status
                    if (this.performanceMonitor.frameRate < 30) {
                        this.updateStatus('performance', 'error', 'Performance: Poor');
                    } else if (this.performanceMonitor.frameRate < 45) {
                        this.updateStatus('performance', 'warning', 'Performance: Fair');
                    } else {
                        this.updateStatus('performance', 'success', 'Performance: Good');
                    }
                    
                    requestAnimationFrame(monitorFrame);
                };
                
                requestAnimationFrame(monitorFrame);
            }

            simulateDataUsage(amount) {
                this.dataUsage += amount;
                this.updatePerformanceMetrics();
            }

            updatePerformanceMetrics() {
                document.getElementById('backgroundTasks').textContent = this.backgroundTasksCount;
                document.getElementById('visibleStops').textContent = this.visibleStopsCount;
                document.getElementById('dataUsage').textContent = `${this.dataUsage.toFixed(1)} KB`;
            }
        }

        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            window.transitTracker = new SmartTransitTracker();
        });