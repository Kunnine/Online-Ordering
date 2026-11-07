import { useState, useEffect } from 'react';
import api from '../api/axios';

const QrCodePayment = ({ orderId }) => {
  const [qrCodeData, setQrCodeData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const orderResponse = await api.get(`/orders/${orderId}`);
        const order = orderResponse.data;
        setOrderData(order);

        const qrResponse = await api.get(`/payment/qr/${orderId}`);
        const qrData = qrResponse.data;
        setQrCodeData(qrData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchData();
    }
  }, [orderId]);

  const checkPaymentStatus = async () => {
    if (!orderId) return;
    try {
      const response = await api.get(`/payment/status/${orderId}`);
      const data = response.data;
      setOrderData((prev) => ({ ...prev, payment_status: data.payment_status }));
      if (data.payment_status === 'paid') {
        alert('Payment confirmed! Your order is being processed.');
      } else if (data.payment_status === 'failed') {
        alert('Payment failed. Please try again.');
      }
    } catch (err) {
      alert('Error checking payment status: ' + err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-8">Error: {error}</div>;
  }

  if (!orderData || !qrCodeData) {
    return <div className="text-center py-8">No data available</div>;
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      unpaid: { text: 'Unpaid', color: 'bg-yellow-100 text-yellow-800' },
      pending: { text: 'Pending', color: 'bg-blue-100 text-blue-800' },
      paid: { text: 'Paid', color: 'bg-green-100 text-green-800' },
      failed: { text: 'Failed', color: 'bg-red-100 text-red-800' },
    };
    const statusInfo = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-4">Payment Required</h1>
        <p className="text-gray-600">
          Please scan the QR code below with your banking app to complete payment of{' '}
          <span className="font-bold">KHR {orderData.total_amount.toLocaleString()}</span>
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Order Information</h2>
          <p className="text-sm text-gray-500">
            Order ID: <span className="font-medium">#{orderData.id}</span>
          </p>
          <p className="text-sm text-gray-500">
            Status: {getStatusBadge(orderData.payment_status)} {getStatusBadge(
              orderData.order_status
            )}
          </p>
        </div>

        <div className="flex justify-center">
            <img
              src={qrCodeData.qrImage || qrCodeData.qr_base64 || qrCodeData.qr_code_base64}
              alt="Payment QR Code"
            className="w-64 h-64 border border-gray-200 rounded"
          />
        </div>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500">
            Scan this QR code with your ABA, ACLEDA, or Wing banking app
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Amount: KHR {orderData.total_amount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">After Payment</h2>
        <div className="space-y-4">
          <button
            onClick={checkPaymentStatus}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Check Payment Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrCodePayment;
