// Global State Management
const AppState = {
    transactions: [],
    initialized: false,
    charts: {
        cashFlow: null,
        suppliers: null
    }
};

// Utility Functions
const Utils = {
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    },

    formatDate: (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    calculateDaysDifference: (date1, date2) => {
        return Math.ceil((date1 - date2) / (1000 * 60 * 60 * 24));
    },

    generateId: () => {
        return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

// Local Storage Management
const StorageManager = {
    KEYS: {
        TRANSACTIONS: 'bhavik_transactions',
        SETTINGS: 'bhavik_settings'
    },

    saveTransactions: () => {
        localStorage.setItem(
            StorageManager.KEYS.TRANSACTIONS,
            JSON.stringify(AppState.transactions)
        );
    },

    loadTransactions: () => {
        const stored = localStorage.getItem(StorageManager.KEYS.TRANSACTIONS);
        if (stored) {
            AppState.transactions = JSON.parse(stored);
        }
    },

    clearAll: () => {
        localStorage.clear();
        AppState.transactions = [];
    }
};

// Transaction Management
const TransactionManager = {
    addTransaction: (formData) => {
        const transaction = {
            id: Utils.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'pending',
            type: formData.type,
            productName: formData.productName,
            supplierName: formData.supplierName,
            quantity: parseFloat(formData.quantity),
            amount: parseFloat(formData.amount),
            dueDate: formData.dueDate,
            notes: formData.notes
        };

        AppState.transactions.unshift(transaction);
        StorageManager.saveTransactions();
        UIManager.updateAllViews();
        NotificationManager.show('Transaction added successfully', 'success');
        return transaction;
    },

    updateTransactionStatus: (transactionId, newStatus) => {
        const transaction = AppState.transactions.find(t => t.id === transactionId);
        if (transaction) {
            transaction.status = newStatus;
            transaction.updatedAt = new Date().toISOString();
            StorageManager.saveTransactions();
            UIManager.updateAllViews();
            NotificationManager.show('Transaction status updated', 'success');
        }
    },

    getTransactionsByStatus: (status = 'all') => {
        if (status === 'all') return AppState.transactions;
        return AppState.transactions.filter(t => t.status === status);
    },

    getOverdueTransactions: () => {
        const today = new Date();
        return AppState.transactions.filter(t => {
            return t.status === 'pending' && new Date(t.dueDate) < today;
        });
    },

    calculateTotals: () => {
        const pendingTransactions = TransactionManager.getTransactionsByStatus('pending');
        const overdueTransactions = TransactionManager.getOverdueTransactions();
        
        return {
            pendingAmount: pendingTransactions.reduce((sum, t) => sum + t.amount, 0),
            overdueAmount: overdueTransactions.reduce((sum, t) => sum + t.amount, 0),
            todayCount: AppState.transactions.filter(t => 
                new Date(t.createdAt).toDateString() === new Date().toDateString()
            ).length
        };
    },

    deleteTransaction: (transactionId) => {
        const index = AppState.transactions.findIndex(t => t.id === transactionId);
        if (index !== -1) {
            AppState.transactions.splice(index, 1);
            StorageManager.saveTransactions();
            UIManager.updateAllViews();
            NotificationManager.show('Transaction deleted successfully', 'success');
        }
    }
};

// Notification Management
const NotificationManager = {
    show: (message, type = 'info') => {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fadeOut');
            setTimeout(() => notification.remove(), 300);
        }, 4700);
    },

    checkDuePayments: () => {
        const today = new Date();
        AppState.transactions
            .filter(t => t.status === 'pending')
            .forEach(t => {
                const dueDate = new Date(t.dueDate);
                const daysUntilDue = Utils.calculateDaysDifference(dueDate, today);
                
                if (daysUntilDue <= 3 && daysUntilDue > 0) {
                    NotificationManager.show(
                        `Payment of ${Utils.formatCurrency(t.amount)} to ${t.supplierName} is due in ${daysUntilDue} days`,
                        'warning'
                    );
                } else if (daysUntilDue <= 0) {
                    NotificationManager.show(
                        `Payment of ${Utils.formatCurrency(t.amount)} to ${t.supplierName} is overdue!`,
                        'error'
                    );
                }
            });
    }
};

// Chart Management
const ChartManager = {
    initializeCharts: () => {
        // Cash Flow Chart
        const cashFlowCtx = document.getElementById('cashFlowChart').getContext('2d');
        AppState.charts.cashFlow = new Chart(cashFlowCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Debit',
                    borderColor: '#dc3545',
                    data: []
                }, {
                    label: 'Credit',
                    borderColor: '#28a745',
                    data: []
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => Utils.formatCurrency(value)
                        }
                    }
                }
            }
        });

        // Suppliers Chart
        const suppliersCtx = document.getElementById('suppliersChart').getContext('2d');
        AppState.charts.suppliers = new Chart(suppliersCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Total Amount',
                    backgroundColor: '#3498db',
                    data: []
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => Utils.formatCurrency(value)
                        }
                    }
                }
            }
        });
    },

    updateCharts: () => {
        // Update Cash Flow Chart
        const cashFlowData = ChartManager.processCashFlowData();
        AppState.charts.cashFlow.data.labels = cashFlowData.labels;
        AppState.charts.cashFlow.data.datasets[0].data = cashFlowData.debit;
        AppState.charts.cashFlow.data.datasets[1].data = cashFlowData.credit;
        AppState.charts.cashFlow.update();

        // Update Suppliers Chart
        const suppliersData = ChartManager.processSuppliersData();
        AppState.charts.suppliers.data.labels = suppliersData.labels;
        AppState.charts.suppliers.data.datasets[0].data = suppliersData.values;
        AppState.charts.suppliers.update();
    },

    processCashFlowData: () => {
        const last7Days = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        }).reverse();

        const debitData = new Array(7).fill(0);
        const creditData = new Array(7).fill(0);

        AppState.transactions.forEach(t => {
            const date = t.createdAt.split('T')[0];
            const dayIndex = last7Days.indexOf(date);
            if (dayIndex !== -1) {
                if (t.type === 'debit') {
                    debitData[dayIndex] += t.amount;
                } else {
                    creditData[dayIndex] += t.amount;
                }
            }
        });

        return {
            labels: last7Days.map(date => Utils.formatDate(date)),
            debit: debitData,
            credit: creditData
        };
    },

    processSuppliersData: () => {
        const supplierMap = new Map();
        AppState.transactions.forEach(t => {
            const current = supplierMap.get(t.supplierName) || 0;
            supplierMap.set(t.supplierName, current + t.amount);
        });

        const sortedSuppliers = Array.from(supplierMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            labels: sortedSuppliers.map(s => s[0]),
            values: sortedSuppliers.map(s => s[1])
        };
    }
};

// UI Management
const UIManager = {
    initialize: () => {
        UIManager.bindEvents();
        UIManager.updateAllViews();
        ChartManager.initializeCharts();
        NotificationManager.checkDuePayments();
    },

    bindEvents: () => {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                UIManager.handleNavigation(e.target.dataset.page);
            });
        });

        // Transaction Form
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                type: document.getElementById('transactionType').value,
                productName: document.getElementById('productName').value,
                supplierName: document.getElementById('supplierName').value,
                quantity: document.getElementById('quantity').value,
                amount: document.getElementById('amount').value,
                dueDate: document.getElementById('dueDate').value,
                notes: document.getElementById('notes').value
            };
            TransactionManager.addTransaction(formData);
            e.target.reset();
        });

        // Payment Filters
        document.getElementById('paymentStatusFilter').addEventListener('change', 
            UIManager.updatePaymentsTable
        );
        document.getElementById('paymentSearch').addEventListener('input', 
            UIManager.updatePaymentsTable
        );

        // Report Date Range
        document.getElementById('startDate').addEventListener('change', 
            ChartManager.updateCharts
        );
        document.getElementById('endDate').addEventListener('change', 
            ChartManager.updateCharts
        );
    },

    handleNavigation: (pageId) => {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageId);
        });
        document.querySelectorAll('.page').forEach(page => {
            page.classList.toggle('active', page.id === pageId);
        });
    },

    updateAllViews: () => {
        UIManager.updateDashboard();
        UIManager.updatePaymentsTable();
        UIManager.updateRecentTransactions();
        if (AppState.charts.cashFlow && AppState.charts.suppliers) {
            ChartManager.updateCharts();
        }
    },

    updateDashboard: () => {
        const totals = TransactionManager.calculateTotals();
        document.getElementById('pendingAmount').textContent = Utils.formatCurrency(totals.pendingAmount);
        document.getElementById('overdueAmount').textContent = Utils.formatCurrency(totals.overdueAmount);
        document.getElementById('todayTransactions').textContent = totals.todayCount;
    },

    updateRecentTransactions: () => {
        const tbody = document.getElementById('recentTransactionsList');
        tbody.innerHTML = '';

        AppState.transactions.slice(0, 5).forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Utils.formatDate(t.createdAt)}</td>
                <td>${t.productName}</td>
                <td>${t.supplierName}</td>
                <td>${Utils.formatCurrency(t.amount)}</td>
                <td><span class="status-${t.status}">${t.status}</span></td>
            `;
            tbody.appendChild(row);
        });
    },

    updatePaymentsTable: () => {
        const status = document.getElementById('paymentStatusFilter').value;
        const searchTerm = document.getElementById('paymentSearch').value.toLowerCase();
        
        let transactions = TransactionManager.getTransactionsByStatus(status);
        
        if (searchTerm) {
            transactions = transactions.filter(t => 
                t.productName.toLowerCase().includes(searchTerm) ||
                t.supplierName.toLowerCase().includes(searchTerm)
            );
        }

        const tbody = document.getElementById('paymentsList');
        tbody.innerHTML = '';

        transactions.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Utils.formatDate(t.createdAt)}</td>
                <td>${Utils.formatDate(t.dueDate)}</td>
                <td>${t.productName}</td>
                <td>${t.supplierName}</td>
                <td>${Utils.formatCurrency(t.amount)}</td>
                <td><span class="status-${t.status}">${t.status}</span></td>
                <td>
                    ${t.status === 'pending' ? `
                        <button 
                            onclick="TransactionManager.updateTransactionStatus('${t.id}', 'cleared')"
                            class="btn-action clear"
                        >
                            Clear
                        </button>
                    ` : ''}
                    <button 
                        onclick="TransactionManager.deleteTransaction('${t.id}')"
                        class="btn-action delete"
                    >
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    StorageManager.loadTransactions();
    UIManager.initialize();
    
    // Check for due payments every hour
    setInterval(NotificationManager.checkDuePayments, 3600000);
});
