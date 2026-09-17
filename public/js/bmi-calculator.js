class AdvancedBMICalculator {
    constructor() {
        this.isMetric = true;
        this.currentBMI = null;
        this.currentData = null;
        this.progressChart = null;
        this.gaugeChart = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadHistory();
        this.initializeCharts();
    }

    bindEvents() {
        // Unit toggle
        document.getElementById('metric-btn').addEventListener('click', () => this.toggleUnit(true));
        document.getElementById('imperial-btn').addEventListener('click', () => this.toggleUnit(false));
        
        // Form submission
        document.getElementById('bmi-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateBMI();
        });
        
        // Progress tracking
        document.getElementById('save-progress-btn').addEventListener('click', () => this.saveProgress());
        document.getElementById('clear-history-btn').addEventListener('click', () => this.clearHistory());
        
        // Input validation
        this.addInputValidation();
    }

    toggleUnit(isMetric) {
        this.isMetric = isMetric;
        
        // Update button states
        document.getElementById('metric-btn').classList.toggle('active', isMetric);
        document.getElementById('imperial-btn').classList.toggle('active', !isMetric);
        
        // Update unit labels
        document.getElementById('height-unit').textContent = isMetric ? 'cm' : 'ft/in';
        document.getElementById('weight-unit').textContent = isMetric ? 'kg' : 'lbs';
        
        // Update placeholders
        const heightInput = document.getElementById('height');
        const weightInput = document.getElementById('weight');
        
        if (isMetric) {
            heightInput.placeholder = 'e.g., 175';
            weightInput.placeholder = 'e.g., 70';
            heightInput.step = '0.1';
            weightInput.step = '0.1';
        } else {
            heightInput.placeholder = 'e.g., 5.9';
            weightInput.placeholder = 'e.g., 154';
            heightInput.step = '0.1';
            weightInput.step = '0.1';
        }
        
        // Clear previous values
        heightInput.value = '';
        weightInput.value = '';
    }

    addInputValidation() {
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                const id = e.target.id;
                
                // Validation rules
                if (id === 'age' && (value < 1 || value > 120)) {
                    e.target.setCustomValidity('Age must be between 1 and 120');
                } else if (id === 'height' && value <= 0) {
                    e.target.setCustomValidity('Height must be greater than 0');
                } else if (id === 'weight' && value <= 0) {
                    e.target.setCustomValidity('Weight must be greater than 0');
                } else {
                    e.target.setCustomValidity('');
                }
            });
        });
    }

    calculateBMI() {
        const formData = this.getFormData();
        if (!formData) return;

        // Convert to metric if needed
        let { height, weight } = formData;
        if (!this.isMetric) {
            height = height * 30.48; // feet to cm
            weight = weight * 0.453592; // lbs to kg
        }

        // Calculate BMI
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);
        
        // Calculate additional metrics
        const bmr = this.calculateBMR(weight, height, formData.age, formData.gender);
        const dailyCalories = this.calculateDailyCalories(bmr, formData.activityLevel);
        const idealWeight = this.calculateIdealWeight(height, formData.gender);
        
        this.currentBMI = bmi;
        this.currentData = {
            ...formData,
            height: this.isMetric ? formData.height : height,
            weight: this.isMetric ? formData.weight : weight,
            bmi,
            bmr,
            dailyCalories,
            idealWeight,
            date: new Date().toISOString()
        };

        this.displayResults();
        this.showRecommendations();
        this.enableSaveButton();
    }

    getFormData() {
        const age = parseInt(document.getElementById('age').value);
        const gender = document.getElementById('gender').value;
        const height = parseFloat(document.getElementById('height').value);
        const weight = parseFloat(document.getElementById('weight').value);
        const activityLevel = document.getElementById('activity-level').value;

        if (!age || !gender || !height || !weight || !activityLevel) {
            alert('Please fill in all fields');
            return null;
        }

        return { age, gender, height, weight, activityLevel };
    }

    calculateBMR(weight, height, age, gender) {
        // Mifflin-St Jeor Equation
        if (gender === 'male') {
            return (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
            return (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }
    }

    calculateDailyCalories(bmr, activityLevel) {
        const multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very-active': 1.9
        };
        return Math.round(bmr * multipliers[activityLevel]);
    }

    calculateIdealWeight(height, gender) {
        const heightInCm = height;
        let idealWeight;
        
        if (gender === 'male') {
            idealWeight = 50 + 2.3 * ((heightInCm / 2.54) - 60);
        } else {
            idealWeight = 45.5 + 2.3 * ((heightInCm / 2.54) - 60);
        }
        
        const minWeight = idealWeight * 0.9;
        const maxWeight = idealWeight * 1.1;
        
        return {
            min: Math.round(minWeight * 10) / 10,
            max: Math.round(maxWeight * 10) / 10
        };
    }

    displayResults() {
        const { bmi, bmr, dailyCalories, idealWeight } = this.currentData;
        
        // Display BMI
        document.getElementById('bmi-number').textContent = bmi.toFixed(1);
        
        // Display category
        const category = this.getBMICategory(bmi);
        const categoryElement = document.getElementById('bmi-category');
        categoryElement.textContent = category.name;
        categoryElement.className = `bmi-category ${category.class}`;
        
        // Display metrics
        document.getElementById('daily-calories').textContent = `${dailyCalories} kcal`;
        document.getElementById('ideal-weight').textContent = 
            `${idealWeight.min} - ${idealWeight.max} ${this.isMetric ? 'kg' : 'lbs'}`;
        document.getElementById('bmr').textContent = `${Math.round(bmr)} kcal`;
        
        // Show results section
        const resultsSection = document.getElementById('results-section');
        resultsSection.style.display = 'block';
        resultsSection.classList.add('fade-in');
        
        // Update gauge
        this.updateBMIGauge(bmi);
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    getBMICategory(bmi) {
        if (bmi < 18.5) {
            return { name: 'Underweight', class: 'underweight' };
        } else if (bmi < 25) {
            return { name: 'Normal Weight', class: 'normal' };
        } else if (bmi < 30) {
            return { name: 'Overweight', class: 'overweight' };
        } else {
            return { name: 'Obese', class: 'obese' };
        }
    }

    updateBMIGauge(bmi) {
        const canvas = document.getElementById('bmi-gauge-canvas');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw gauge
        const centerX = canvas.width / 2;
        const centerY = canvas.height - 20;
        const radius = 120;
        
        // Draw background arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, 0);
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();
        
        // Draw colored sections
        const sections = [
            { start: Math.PI, end: Math.PI * 1.25, color: '#3182ce' }, // Underweight
            { start: Math.PI * 1.25, end: Math.PI * 1.5, color: '#38a169' }, // Normal
            { start: Math.PI * 1.5, end: Math.PI * 1.75, color: '#dd6b20' }, // Overweight
            { start: Math.PI * 1.75, end: 0, color: '#e53e3e' } // Obese
        ];
        
        sections.forEach(section => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, section.start, section.end);
            ctx.lineWidth = 20;
            ctx.strokeStyle = section.color;
            ctx.stroke();
        });
        
        // Draw needle
        let needleAngle;
        if (bmi < 18.5) {
            needleAngle = Math.PI + (Math.PI * 0.25 * (bmi / 18.5));
        } else if (bmi < 25) {
            needleAngle = Math.PI * 1.25 + (Math.PI * 0.25 * ((bmi - 18.5) / 6.5));
        } else if (bmi < 30) {
            needleAngle = Math.PI * 1.5 + (Math.PI * 0.25 * ((bmi - 25) / 5));
        } else {
            needleAngle = Math.PI * 1.75 + (Math.PI * 0.25 * Math.min((bmi - 30) / 10, 1));
        }
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(needleAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius - 10, 0);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#2d3748';
        ctx.stroke();
        ctx.restore();
        
        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#2d3748';
        ctx.fill();
        
        // Draw BMI value
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#2d3748';
        ctx.textAlign = 'center';
        ctx.fillText(bmi.toFixed(1), centerX, centerY + 40);
    }

    showRecommendations() {
        const { bmi, gender, age, activityLevel } = this.currentData;
        const category = this.getBMICategory(bmi);
        
        let recommendations = this.getRecommendations(category.class, gender, age, activityLevel);
        
        const recommendationsContent = document.getElementById('recommendations-content');
        recommendationsContent.innerHTML = recommendations;
        
        const recommendationsSection = document.getElementById('recommendations-section');
        recommendationsSection.style.display = 'block';
        recommendationsSection.classList.add('fade-in');
    }

    getRecommendations(category, gender, age, activityLevel) {
        const baseRecommendations = {
            underweight: {
                title: 'Recommendations for Underweight',
                icon: 'fas fa-arrow-up',
                items: [
                    'Increase caloric intake with nutrient-dense foods',
                    'Include healthy fats like nuts, avocados, and olive oil',
                    'Eat frequent, smaller meals throughout the day',
                    'Consider strength training to build muscle mass',
                    'Consult with a healthcare provider or nutritionist'
                ]
            },
            normal: {
                title: 'Maintaining Healthy Weight',
                icon: 'fas fa-check-circle',
                items: [
                    'Continue your current healthy lifestyle',
                    'Maintain a balanced diet with variety',
                    'Stay physically active with regular exercise',
                    'Monitor your weight regularly',
                    'Focus on overall health, not just weight'
                ]
            },
            overweight: {
                title: 'Recommendations for Weight Management',
                icon: 'fas fa-balance-scale',
                items: [
                    'Create a moderate caloric deficit (300-500 calories/day)',
                    'Increase physical activity gradually',
                    'Focus on whole foods and reduce processed foods',
                    'Practice portion control',
                    'Consider consulting with a healthcare provider'
                ]
            },
            obese: {
                title: 'Important Health Recommendations',
                icon: 'fas fa-exclamation-triangle',
                items: [
                    'Consult with a healthcare provider immediately',
                    'Consider a structured weight loss program',
                    'Start with low-impact exercises like walking',
                    'Focus on sustainable dietary changes',
                    'Monitor for obesity-related health conditions'
                ]
            }
        };

        const rec = baseRecommendations[category];
        
        return `
            <div class="recommendation-item">
                <h4><i class="${rec.icon}"></i> ${rec.title}</h4>
                <ul>
                    ${rec.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            <div class="recommendation-item">
                <h4><i class="fas fa-info-circle"></i> Additional Considerations</h4>
                <ul>
                    <li>BMI is a screening tool and may not reflect individual health status</li>
                    <li>Muscle mass, bone density, and body composition are also important</li>
                    <li>Always consult healthcare professionals for personalized advice</li>
                    <li>Focus on healthy habits rather than just the number on the scale</li>
                </ul>
            </div>
        `;
    }

    enableSaveButton() {
        document.getElementById('save-progress-btn').disabled = false;
    }

    saveProgress() {
        if (!this.currentData) return;
        
        let history = JSON.parse(localStorage.getItem('bmiHistory') || '[]');
        
        const entry = {
            date: new Date().toLocaleDateString(),
            weight: this.isMetric ? this.currentData.weight : (this.currentData.weight * 2.20462).toFixed(1),
            bmi: this.currentData.bmi.toFixed(1),
            category: this.getBMICategory(this.currentData.bmi).name,
            unit: this.isMetric ? 'kg' : 'lbs'
        };
        
        history.unshift(entry);
        
        // Keep only last 50 entries
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        localStorage.setItem('bmiHistory', JSON.stringify(history));
        this.updateHistoryTable();
        this.updateProgressChart();
        
        // Show success message
        this.showNotification('Progress saved successfully!', 'success');
    }

    loadHistory() {
        this.updateHistoryTable();
        this.updateProgressChart();
    }

    updateHistoryTable() {
        const history = JSON.parse(localStorage.getItem('bmiHistory') || '[]');
        const tbody = document.getElementById('history-tbody');
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr class="no-data"><td colspan="5">No data available. Calculate your BMI to start tracking!</td></tr>';
            return;
        }
        
        tbody.innerHTML = history.map((entry, index) => `
            <tr>
                <td>${entry.date}</td>
                <td>${entry.weight} ${entry.unit}</td>
                <td>${entry.bmi}</td>
                <td><span class="bmi-category ${this.getBMICategory(parseFloat(entry.bmi)).class}">${entry.category}</span></td>
                <td><button class="delete-btn" onclick="bmiCalculator.deleteHistoryEntry(${index})">Delete</button></td>
            </tr>
        `).join('');
    }

    deleteHistoryEntry(index) {
        let history = JSON.parse(localStorage.getItem('bmiHistory') || '[]');
        history.splice(index, 1);
        localStorage.setItem('bmiHistory', JSON.stringify(history));
        this.updateHistoryTable();
        this.updateProgressChart();
        this.showNotification('Entry deleted successfully!', 'info');
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
            localStorage.removeItem('bmiHistory');
            this.updateHistoryTable();
            this.updateProgressChart();
            this.showNotification('History cleared successfully!', 'info');
        }
    }

    initializeCharts() {
        this.updateProgressChart();
    }

    updateProgressChart() {
        const history = JSON.parse(localStorage.getItem('bmiHistory') || '[]');
        const ctx = document.getElementById('progress-chart').getContext('2d');
        
        if (this.progressChart) {
            this.progressChart.destroy();
        }
        
        const data = history.slice(0, 20).reverse(); // Show last 20 entries
        
        this.progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(entry => entry.date),
                datasets: [{
                    label: 'BMI',
                    data: data.map(entry => parseFloat(entry.bmi)),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'BMI Progress Over Time',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 15,
                        max: 40,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : '#667eea'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the calculator when the page loads
let bmiCalculator;
document.addEventListener('DOMContentLoaded', () => {
    bmiCalculator = new AdvancedBMICalculator();
});