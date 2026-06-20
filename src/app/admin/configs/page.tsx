'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { Settings, Save, Edit, RefreshCw, X } from 'lucide-react';
import type { ApiResponse } from '@/types/api';

interface SystemConfig {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export default function ConfigsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiResponse<SystemConfig[]>>('/admin/configs');
      setConfigs(response.data || []);
    } catch (error: unknown) {
      console.error(error);
      toast.error('Lỗi khi tải danh sách cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: SystemConfig) => {
    setSelectedConfig(config);
    setEditValue(config.value);
    setEditDesc(config.description || '');
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedConfig || !editValue.trim()) {
      toast.error('Giá trị cấu hình không được để trống');
      return;
    }
    setProcessing(true);
    try {
      await api.put<ApiResponse<SystemConfig>>(`/admin/configs/${selectedConfig.key}`, {
        value: editValue.trim(),
        description: editDesc.trim(),
      });
      toast.success('Cập nhật cấu hình hệ thống thành công!');
      setShowEditModal(false);
      fetchConfigs();
    } catch (error: unknown) {
      console.error(error);
      toast.error('Lỗi khi cập nhật cấu hình');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Cấu Hình Hệ Thống Toàn Cục
          </h2>
          <p className="text-slate-500 text-sm">Thiết lập các biến hệ thống liên quan tới ELO, phí dịch vụ nền tảng, v.v.</p>
        </div>
        <button
          onClick={fetchConfigs}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-2 rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main configurations card */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <p className="text-base font-medium text-slate-800">Chưa có cấu hình hệ thống nào</p>
          <p className="text-xs text-slate-500 mt-1">Admin có thể thêm mới cấu hình bằng API hoặc các DDL script.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6 w-1/4">Tên cấu hình (Key)</th>
                  <th className="p-4 w-1/4">Giá trị</th>
                  <th className="p-4 w-2/5">Mô tả</th>
                  <th className="p-4 pr-6 text-right w-12">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {configs.map((config) => (
                  <tr key={config.key} className="hover:bg-slate-50 transition-all duration-150">
                    <td className="p-4 pl-6 font-mono text-blue-600 font-semibold">{config.key}</td>
                    <td className="p-4 font-semibold text-slate-800">{config.value}</td>
                    <td className="p-4 text-xs text-slate-500 leading-relaxed">{config.description || 'Chưa có mô tả'}</td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handleEdit(config)}
                        className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-transparent p-1.5 rounded-xl transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {showEditModal && selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Cập Nhật Biến Hệ Thống</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Tên biến (Key)</p>
                <p className="text-sm font-mono font-semibold text-blue-600">{selectedConfig.key}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Giá trị mới (Value)</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Nhập giá trị cấu hình..."
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Mô tả cấu hình</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Nhập mô tả cho biến này..."
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors resize-none"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdate}
                disabled={processing || !editValue.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
