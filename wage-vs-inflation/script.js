document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('dataForm');
    const yearInput = document.getElementById('year');
    const wagesInput = document.getElementById('wages');
    const inflationInput = document.getElementById('inflation');
    const dataTableBody = document.getElementById('dataTableBody');
    const avgWageGrowth = document.getElementById('avgWageGrowth');
    const avgInflation = document.getElementById('avgInflation');
    const realWageGrowth = document.getElementById('realWageGrowth');
    const wageChartCtx = document.getElementById('wageChart').getContext('2d');

    let dataPoints = [];

    // Function to show user messages
    function showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        // Insert message at the top of the container
        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);
        
        // Auto-remove message after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }

    // Function to recalculate wage changes based on chronological order
    function recalculateWageChanges() {
        // Sort data points by year
        dataPoints.sort((a, b) => a.year - b.year);
        
        // Recalculate wage changes
        dataPoints.forEach((point, index) => {
            if (index === 0) {
                point.wageChange = 0; // First year has no previous wage to compare
            } else {
                const prevPoint = dataPoints[index - 1];
                point.wageChange = ((point.wages - prevPoint.wages) / prevPoint.wages) * 100;
            }
        });
    }

    const wageChart = new Chart(wageChartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Wage Increase (%)',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.4
                },
                {
                    label: 'Inflation (%)',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e2e8f0',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year',
                        color: '#cbd5e1',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(71, 85, 105, 0.3)'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Percentage (%)',
                        color: '#cbd5e1',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(71, 85, 105, 0.3)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const year = parseInt(yearInput.value);
        const wages = parseFloat(wagesInput.value);
        const inflationValue = inflationInput.value.trim();
        const inflation = inflationValue === '' ? null : parseFloat(inflationValue);

        // Check if data point for this year already exists
        const existingIndex = dataPoints.findIndex(point => point.year === year);
        
        if (existingIndex !== -1) {
            // Update existing data point
            const existingPoint = dataPoints[existingIndex];
            dataPoints[existingIndex] = {
                year: year,
                wages: wages,
                inflation: inflation !== null ? inflation : existingPoint.inflation,
                wageChange: 0 // Will be recalculated below
            };
            
            showMessage(`Updated data for year ${year}`, 'info');
        } else {
            // Add new data point
            dataPoints.push({
                year: year,
                wages: wages,
                inflation: inflation || 0,
                wageChange: 0 // Will be recalculated below
            });
            
            showMessage(`Added new data point for year ${year}`, 'success');
        }

        // Recalculate wage changes for all data points
        recalculateWageChanges();
        
        updateTable();
        updateChart();
        updateSummary();

        form.reset();
    });

    function updateTable() {
        dataTableBody.innerHTML = '';
        const sortedDataPoints = [...dataPoints].sort((a, b) => a.year - b.year);
        sortedDataPoints.forEach((point, index) => {
            const row = document.createElement('tr');
            
            // Format values, showing N/A for invalid numbers
            const wagesDisplay = isNaN(point.wages) || !isFinite(point.wages) ? 'N/A' : point.wages.toFixed(2);
            const inflationDisplay = isNaN(point.inflation) || !isFinite(point.inflation) ? 'N/A' : point.inflation.toFixed(2);
            const wageChangeDisplay = isNaN(point.wageChange) || !isFinite(point.wageChange) ? 'N/A' : point.wageChange.toFixed(2);
            
            row.innerHTML = `
                <th>${point.year}</th>
                <td>${wagesDisplay}</td>
                <td>${inflationDisplay}</td>
                <td>${wageChangeDisplay}</td>
                <td><button class="delete-btn" data-year="${point.year}">Delete</button></td>
            `;
            dataTableBody.appendChild(row);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const year = parseInt(event.target.getAttribute('data-year'));
                const index = dataPoints.findIndex(p => p.year === year);
                if (index !== -1) {
                    dataPoints.splice(index, 1);
                    recalculateWageChanges();
                    updateTable();
                    updateChart();
                    updateSummary();
                    showMessage(`Deleted data for year ${year}`, 'info');
                }
            });
        });
    }

    function updateChart() {
        const sortedDataPoints = [...dataPoints].sort((a, b) => a.year - b.year);
        
        // Get all years that have at least one valid value
        const allYears = sortedDataPoints.map(point => point.year);
        
        // Prepare data arrays with null for invalid values (Chart.js will skip null values)
        const wageChangeData = sortedDataPoints.map(point => {
            const isValid = !isNaN(point.wageChange) && isFinite(point.wageChange);
            return isValid ? point.wageChange : null;
        });
        
        const inflationData = sortedDataPoints.map(point => {
            const isValid = !isNaN(point.inflation) && isFinite(point.inflation);
            return isValid ? point.inflation : null;
        });
        
        // Update chart with all years and null for invalid values
        wageChart.data.labels = allYears;
        wageChart.data.datasets[0].data = wageChangeData;
        wageChart.data.datasets[1].data = inflationData;
        wageChart.update();
    }

    function updateSummary() {
        // Filter out NaN and invalid values for calculations
        const validWageChanges = dataPoints
            .map(point => point.wageChange)
            .filter(value => !isNaN(value) && isFinite(value));
        
        const validInflationRates = dataPoints
            .map(point => point.inflation)
            .filter(value => !isNaN(value) && isFinite(value));
        
        const totalWageChange = validWageChanges.reduce((sum, value) => sum + value, 0);
        const averageWageChange = validWageChanges.length > 0 ? totalWageChange / validWageChanges.length : 0;

        const totalInflation = validInflationRates.reduce((sum, value) => sum + value, 0);
        const averageInflation = validInflationRates.length > 0 ? totalInflation / validInflationRates.length : 0;

        const realGrowth = averageWageChange - averageInflation;

        avgWageGrowth.textContent = validWageChanges.length > 0 ? `${averageWageChange.toFixed(2)}%` : 'N/A';
        avgInflation.textContent = validInflationRates.length > 0 ? `${averageInflation.toFixed(2)}%` : 'N/A';
        realWageGrowth.textContent = (validWageChanges.length > 0 && validInflationRates.length > 0) ? `${realGrowth.toFixed(2)}%` : 'N/A';

        if (validWageChanges.length > 0 && validInflationRates.length > 0) {
            realWageGrowth.className = realGrowth > 0 ? 'positive' : realGrowth < 0 ? 'negative' : 'neutral';
        } else {
            realWageGrowth.className = 'neutral';
        }
    }

    document.getElementById('clearData').addEventListener('click', () => {
        dataPoints = [];
        updateTable();
        updateChart();
        updateSummary();
    });

    document.getElementById('recalculateData').addEventListener('click', () => {
        if (dataPoints.length === 0) {
            showMessage('No data points to recalculate', 'info');
            return;
        }
        
        recalculateWageChanges();
        updateTable();
        updateChart();
        updateSummary();
        
        showMessage('Wage changes recalculated successfully', 'success');
    });

document.getElementById('exportData').addEventListener('click', () => {
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Year,Wages,Inflation,Wage Change\n" 
            + dataPoints.map(p => `${p.year},${p.wages.toFixed(2)},${p.inflation.toFixed(2)},${p.wageChange.toFixed(2)}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "wages_inflation_data.csv");
        document.body.appendChild(link);

        link.click();
        document.body.removeChild(link);
    });

    document.getElementById('importData').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const contents = e.target.result;
                    const lines = contents.split('\n');
                    const header = lines.shift(); // Remove header line
                    
                    // Validate header format
                    if (!header || !header.toLowerCase().includes('year') || 
                        !header.toLowerCase().includes('wages') || 
                        !header.toLowerCase().includes('inflation')) {
                        showMessage('Invalid CSV format. Expected columns: Year, Wages, Inflation', 'error');
                        return;
                    }
                    
                    const importedData = [];
                    lines.forEach((line, index) => {
                        if (line.trim().length > 0) {
                            const values = line.split(',');
                            if (values.length >= 3) {
                                const year = parseInt(values[0]);
                                const wages = parseFloat(values[1]);
                                const inflation = parseFloat(values[2]);
                                
                                if (!isNaN(year) && !isNaN(wages) && !isNaN(inflation)) {
                                    importedData.push({ year, wages, inflation });
                                } else {
                                    console.warn(`Skipping invalid data on line ${index + 2}: ${line}`);
                                }
                            }
                        }
                    });
                    
                    if (importedData.length === 0) {
                        showMessage('No valid data found in CSV file', 'error');
                        return;
                    }
                    
                    // Sort imported data by year and calculate wage changes
                    importedData.sort((a, b) => a.year - b.year);
                    
                    // Clear existing data and add imported data
                    dataPoints = [];
                    importedData.forEach((point, index) => {
                        const prevPoint = importedData[index - 1];
                        const wageChange = prevPoint ? 
                            ((point.wages - prevPoint.wages) / prevPoint.wages) * 100 : 0;
                        
                        dataPoints.push({
                            year: point.year,
                            wages: point.wages,
                            inflation: point.inflation,
                            wageChange: wageChange
                        });
                    });
                    
                    updateTable();
                    updateChart();
                    updateSummary();
                    
                    showMessage(`Successfully imported ${dataPoints.length} data points`, 'success');
                    
                } catch (error) {
                    showMessage('Error reading CSV file: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        }
        
        // Reset file input
        event.target.value = '';
    });
});

