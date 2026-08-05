
//MFCDemoDlg.h : 头文件
//

#pragma once

// CPRTMFCDemoDlg 对话框
class CPRTMFCDemoDlg : public CDialogEx
{
private:
	
// 构造
public:
	CPRTMFCDemoDlg(CWnd* pParent = NULL);	// 标准构造函数

// 对话框数据
	enum { IDD = IDD_PRTMFCDEMO_DIALOG };

	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV 支持


// 实现
protected:
	HICON m_hIcon;
	
	// 生成的消息映射函数
	virtual BOOL OnInitDialog();
	afx_msg void OnSysCommand(UINT nID, LPARAM lParam);
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();

	DECLARE_MESSAGE_MAP()
	
public:
	afx_msg void OnBnClickedPortOpen();
	afx_msg void OnBnClickedPrintReceipt();
	afx_msg void OnBnClickedStop();
	afx_msg void OnBnClickedLabel();
	afx_msg void OnBnClickedStatus();
	afx_msg void OnBnClickedOther();
	afx_msg void OnBnClickedPrintimage();
	afx_msg void OnCBNPortSelChange();
	afx_msg void OnEnChangeTxtModel();
	afx_msg void OnCBNImageSelChange();
	void SetItemsEnable(bool);
	afx_msg void OnBnClickedVersion();
	afx_msg void OnBnClickedWindowsfont();
	afx_msg void OnEnChangeAddress();
	afx_msg void OnBnClickedWrite();
	afx_msg void OnEnChangeWritedate();
	afx_msg void OnBnClickedRead();
	afx_msg void OnEnChangeReaddate();
	afx_msg void OnBnClickedNumber();
};
