Namespace Demo.Printer
    <Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
    Partial Class PrtWinDemoForm
        Inherits System.Windows.Forms.Form

        'Form 重写 Dispose，以清理组件列表。
        <System.Diagnostics.DebuggerNonUserCode()> _
        Protected Overrides Sub Dispose(ByVal disposing As Boolean)
            Try
                If disposing AndAlso components IsNot Nothing Then
                    components.Dispose()
                End If
            Finally
                MyBase.Dispose(disposing)
            End Try
        End Sub

        'Windows 窗体设计器所必需的
        Private components As System.ComponentModel.IContainer

        '注意: 以下过程是 Windows 窗体设计器所必需的
        '可以使用 Windows 窗体设计器修改它。
        '不要使用代码编辑器修改它。
        <System.Diagnostics.DebuggerStepThrough()> _
        Private Sub InitializeComponent()
            Me.btnWindowsFont = New System.Windows.Forms.Button()
            Me.lblModel = New System.Windows.Forms.Label()
            Me.tabPage1 = New System.Windows.Forms.TabPage()
            Me.btnPrintReceipt = New System.Windows.Forms.Button()
            Me.btnPrintLabel = New System.Windows.Forms.Button()
            Me.txtPortSetting = New System.Windows.Forms.TextBox()
            Me.cmbPortType = New System.Windows.Forms.ComboBox()
            Me.cmbImage = New System.Windows.Forms.ComboBox()
            Me.btnConnect = New System.Windows.Forms.Button()
            Me.tabControl1 = New System.Windows.Forms.TabControl()
            Me.tabPage2 = New System.Windows.Forms.TabPage()
            Me.btnPrint = New System.Windows.Forms.Button()
            Me.btnDownLoadImage = New System.Windows.Forms.Button()
            Me.tabPage3 = New System.Windows.Forms.TabPage()
            Me.btnRealTimeStatus = New System.Windows.Forms.Button()
            Me.btnDirectIO = New System.Windows.Forms.Button()
            Me.tabPage4 = New System.Windows.Forms.TabPage()
            Me.tabPage5 = New System.Windows.Forms.TabPage()
            Me.btnSN = New System.Windows.Forms.Button()
            Me.btnVersion = New System.Windows.Forms.Button()
            Me.TabPage6 = New System.Windows.Forms.TabPage()
            Me.Button1 = New System.Windows.Forms.Button()
            Me.btnClose = New System.Windows.Forms.Button()
            Me.btnStop = New System.Windows.Forms.Button()
            Me.grbBtn = New System.Windows.Forms.GroupBox()
            Me.tboxInfo = New System.Windows.Forms.TextBox()
            Me.grbConfig = New System.Windows.Forms.GroupBox()
            Me.txtModel = New System.Windows.Forms.TextBox()
            Me.labPortName = New System.Windows.Forms.Label()
            Me.label1 = New System.Windows.Forms.Label()
            Me.tabPage1.SuspendLayout()
            Me.tabControl1.SuspendLayout()
            Me.tabPage2.SuspendLayout()
            Me.tabPage3.SuspendLayout()
            Me.tabPage4.SuspendLayout()
            Me.tabPage5.SuspendLayout()
            Me.TabPage6.SuspendLayout()
            Me.grbBtn.SuspendLayout()
            Me.grbConfig.SuspendLayout()
            Me.SuspendLayout()
            '
            'btnWindowsFont
            '
            Me.btnWindowsFont.Location = New System.Drawing.Point(116, 10)
            Me.btnWindowsFont.Name = "btnWindowsFont"
            Me.btnWindowsFont.Size = New System.Drawing.Size(84, 30)
            Me.btnWindowsFont.TabIndex = 30
            Me.btnWindowsFont.Text = "WindowsFont"
            Me.btnWindowsFont.UseVisualStyleBackColor = True
            '
            'lblModel
            '
            Me.lblModel.AutoSize = True
            Me.lblModel.Font = New System.Drawing.Font("宋体", 10.5!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(134, Byte))
            Me.lblModel.Location = New System.Drawing.Point(8, 21)
            Me.lblModel.Name = "lblModel"
            Me.lblModel.Size = New System.Drawing.Size(49, 14)
            Me.lblModel.TabIndex = 27
            Me.lblModel.Text = "Model:"
            '
            'tabPage1
            '
            Me.tabPage1.Controls.Add(Me.btnPrintReceipt)
            Me.tabPage1.Controls.Add(Me.btnPrintLabel)
            Me.tabPage1.Location = New System.Drawing.Point(4, 22)
            Me.tabPage1.Name = "tabPage1"
            Me.tabPage1.Padding = New System.Windows.Forms.Padding(3)
            Me.tabPage1.Size = New System.Drawing.Size(352, 48)
            Me.tabPage1.TabIndex = 0
            Me.tabPage1.Text = "Print"
            Me.tabPage1.UseVisualStyleBackColor = True
            '
            'btnPrintReceipt
            '
            Me.btnPrintReceipt.Location = New System.Drawing.Point(37, 10)
            Me.btnPrintReceipt.Name = "btnPrintReceipt"
            Me.btnPrintReceipt.Size = New System.Drawing.Size(89, 30)
            Me.btnPrintReceipt.TabIndex = 22
            Me.btnPrintReceipt.Text = "Receipt"
            Me.btnPrintReceipt.UseVisualStyleBackColor = True
            '
            'btnPrintLabel
            '
            Me.btnPrintLabel.Location = New System.Drawing.Point(220, 10)
            Me.btnPrintLabel.Name = "btnPrintLabel"
            Me.btnPrintLabel.Size = New System.Drawing.Size(89, 30)
            Me.btnPrintLabel.TabIndex = 10
            Me.btnPrintLabel.Text = "Label"
            '
            'txtPortSetting
            '
            Me.txtPortSetting.Location = New System.Drawing.Point(264, 18)
            Me.txtPortSetting.Name = "txtPortSetting"
            Me.txtPortSetting.Size = New System.Drawing.Size(130, 21)
            Me.txtPortSetting.TabIndex = 23
            '
            'cmbPortType
            '
            Me.cmbPortType.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
            Me.cmbPortType.Items.AddRange(New Object() {"USB", "COM"})
            Me.cmbPortType.Location = New System.Drawing.Point(196, 18)
            Me.cmbPortType.Name = "cmbPortType"
            Me.cmbPortType.Size = New System.Drawing.Size(62, 20)
            Me.cmbPortType.TabIndex = 6
            '
            'cmbImage
            '
            Me.cmbImage.FormattingEnabled = True
            Me.cmbImage.Items.AddRange(New Object() {"Image", "BufferedImage", "NVImage"})
            Me.cmbImage.Location = New System.Drawing.Point(6, 15)
            Me.cmbImage.Name = "cmbImage"
            Me.cmbImage.Size = New System.Drawing.Size(140, 20)
            Me.cmbImage.TabIndex = 33
            '
            'btnConnect
            '
            Me.btnConnect.Location = New System.Drawing.Point(227, 65)
            Me.btnConnect.Name = "btnConnect"
            Me.btnConnect.Size = New System.Drawing.Size(75, 30)
            Me.btnConnect.TabIndex = 37
            Me.btnConnect.Text = "Connect"
            '
            'tabControl1
            '
            Me.tabControl1.Controls.Add(Me.tabPage1)
            Me.tabControl1.Controls.Add(Me.tabPage2)
            Me.tabControl1.Controls.Add(Me.tabPage3)
            Me.tabControl1.Controls.Add(Me.tabPage4)
            Me.tabControl1.Controls.Add(Me.tabPage5)
            Me.tabControl1.Controls.Add(Me.TabPage6)
            Me.tabControl1.Location = New System.Drawing.Point(11, 20)
            Me.tabControl1.Name = "tabControl1"
            Me.tabControl1.SelectedIndex = 0
            Me.tabControl1.Size = New System.Drawing.Size(360, 74)
            Me.tabControl1.TabIndex = 30
            '
            'tabPage2
            '
            Me.tabPage2.Controls.Add(Me.btnPrint)
            Me.tabPage2.Controls.Add(Me.btnDownLoadImage)
            Me.tabPage2.Controls.Add(Me.cmbImage)
            Me.tabPage2.Location = New System.Drawing.Point(4, 22)
            Me.tabPage2.Name = "tabPage2"
            Me.tabPage2.Padding = New System.Windows.Forms.Padding(3)
            Me.tabPage2.Size = New System.Drawing.Size(352, 48)
            Me.tabPage2.TabIndex = 1
            Me.tabPage2.Text = "Image"
            Me.tabPage2.UseVisualStyleBackColor = True
            '
            'btnPrint
            '
            Me.btnPrint.Enabled = False
            Me.btnPrint.Location = New System.Drawing.Point(257, 9)
            Me.btnPrint.Name = "btnPrint"
            Me.btnPrint.Size = New System.Drawing.Size(75, 30)
            Me.btnPrint.TabIndex = 35
            Me.btnPrint.Text = "Print"
            Me.btnPrint.UseVisualStyleBackColor = True
            '
            'btnDownLoadImage
            '
            Me.btnDownLoadImage.Location = New System.Drawing.Point(158, 9)
            Me.btnDownLoadImage.Name = "btnDownLoadImage"
            Me.btnDownLoadImage.Size = New System.Drawing.Size(75, 30)
            Me.btnDownLoadImage.TabIndex = 34
            Me.btnDownLoadImage.Text = "Download"
            Me.btnDownLoadImage.UseVisualStyleBackColor = True
            '
            'tabPage3
            '
            Me.tabPage3.Controls.Add(Me.btnRealTimeStatus)
            Me.tabPage3.Controls.Add(Me.btnDirectIO)
            Me.tabPage3.Location = New System.Drawing.Point(4, 22)
            Me.tabPage3.Name = "tabPage3"
            Me.tabPage3.Padding = New System.Windows.Forms.Padding(3)
            Me.tabPage3.Size = New System.Drawing.Size(352, 48)
            Me.tabPage3.TabIndex = 2
            Me.tabPage3.Text = "Status"
            Me.tabPage3.UseVisualStyleBackColor = True
            '
            'btnRealTimeStatus
            '
            Me.btnRealTimeStatus.Location = New System.Drawing.Point(51, 9)
            Me.btnRealTimeStatus.Name = "btnRealTimeStatus"
            Me.btnRealTimeStatus.Size = New System.Drawing.Size(89, 30)
            Me.btnRealTimeStatus.TabIndex = 15
            Me.btnRealTimeStatus.Text = "State"
            '
            'btnDirectIO
            '
            Me.btnDirectIO.Location = New System.Drawing.Point(208, 9)
            Me.btnDirectIO.Name = "btnDirectIO"
            Me.btnDirectIO.Size = New System.Drawing.Size(89, 30)
            Me.btnDirectIO.TabIndex = 24
            Me.btnDirectIO.Text = "Other"
            Me.btnDirectIO.UseVisualStyleBackColor = True
            '
            'tabPage4
            '
            Me.tabPage4.Controls.Add(Me.btnWindowsFont)
            Me.tabPage4.Location = New System.Drawing.Point(4, 22)
            Me.tabPage4.Name = "tabPage4"
            Me.tabPage4.Size = New System.Drawing.Size(352, 48)
            Me.tabPage4.TabIndex = 3
            Me.tabPage4.Text = "WindowsFont"
            Me.tabPage4.UseVisualStyleBackColor = True
            '
            'tabPage5
            '
            Me.tabPage5.Controls.Add(Me.btnSN)
            Me.tabPage5.Controls.Add(Me.btnVersion)
            Me.tabPage5.Location = New System.Drawing.Point(4, 22)
            Me.tabPage5.Name = "tabPage5"
            Me.tabPage5.Size = New System.Drawing.Size(352, 48)
            Me.tabPage5.TabIndex = 4
            Me.tabPage5.Text = "Version/SN"
            Me.tabPage5.UseVisualStyleBackColor = True
            '
            'btnSN
            '
            Me.btnSN.Location = New System.Drawing.Point(200, 9)
            Me.btnSN.Name = "btnSN"
            Me.btnSN.Size = New System.Drawing.Size(94, 30)
            Me.btnSN.TabIndex = 32
            Me.btnSN.Text = "SN"
            Me.btnSN.UseVisualStyleBackColor = True
            '
            'btnVersion
            '
            Me.btnVersion.Location = New System.Drawing.Point(70, 9)
            Me.btnVersion.Name = "btnVersion"
            Me.btnVersion.Size = New System.Drawing.Size(84, 30)
            Me.btnVersion.TabIndex = 31
            Me.btnVersion.Text = "Version"
            Me.btnVersion.UseVisualStyleBackColor = True
            '
            'TabPage6
            '
            Me.TabPage6.Controls.Add(Me.Button1)
            Me.TabPage6.Location = New System.Drawing.Point(4, 22)
            Me.TabPage6.Name = "TabPage6"
            Me.TabPage6.Padding = New System.Windows.Forms.Padding(3)
            Me.TabPage6.Size = New System.Drawing.Size(352, 48)
            Me.TabPage6.TabIndex = 5
            Me.TabPage6.Text = "Number"
            Me.TabPage6.UseVisualStyleBackColor = True
            '
            'Button1
            '
            Me.Button1.Location = New System.Drawing.Point(146, 14)
            Me.Button1.Name = "Button1"
            Me.Button1.Size = New System.Drawing.Size(75, 23)
            Me.Button1.TabIndex = 0
            Me.Button1.Text = "get_Number"
            Me.Button1.UseVisualStyleBackColor = True
            '
            'btnClose
            '
            Me.btnClose.Location = New System.Drawing.Point(308, 272)
            Me.btnClose.Name = "btnClose"
            Me.btnClose.Size = New System.Drawing.Size(75, 30)
            Me.btnClose.TabIndex = 38
            Me.btnClose.Text = "Close"
            '
            'btnStop
            '
            Me.btnStop.Location = New System.Drawing.Point(308, 65)
            Me.btnStop.Name = "btnStop"
            Me.btnStop.Size = New System.Drawing.Size(75, 30)
            Me.btnStop.TabIndex = 39
            Me.btnStop.Text = "Stop"
            '
            'grbBtn
            '
            Me.grbBtn.Controls.Add(Me.tabControl1)
            Me.grbBtn.Location = New System.Drawing.Point(12, 95)
            Me.grbBtn.Name = "grbBtn"
            Me.grbBtn.Size = New System.Drawing.Size(403, 100)
            Me.grbBtn.TabIndex = 41
            Me.grbBtn.TabStop = False
            Me.grbBtn.Text = "Functions"
            '
            'tboxInfo
            '
            Me.tboxInfo.ForeColor = System.Drawing.SystemColors.Highlight
            Me.tboxInfo.Location = New System.Drawing.Point(12, 216)
            Me.tboxInfo.Multiline = True
            Me.tboxInfo.Name = "tboxInfo"
            Me.tboxInfo.ReadOnly = True
            Me.tboxInfo.ScrollBars = System.Windows.Forms.ScrollBars.Vertical
            Me.tboxInfo.Size = New System.Drawing.Size(403, 51)
            Me.tboxInfo.TabIndex = 40
            '
            'grbConfig
            '
            Me.grbConfig.Controls.Add(Me.txtModel)
            Me.grbConfig.Controls.Add(Me.lblModel)
            Me.grbConfig.Controls.Add(Me.txtPortSetting)
            Me.grbConfig.Controls.Add(Me.cmbPortType)
            Me.grbConfig.Controls.Add(Me.labPortName)
            Me.grbConfig.Location = New System.Drawing.Point(12, 12)
            Me.grbConfig.Name = "grbConfig"
            Me.grbConfig.Size = New System.Drawing.Size(403, 47)
            Me.grbConfig.TabIndex = 42
            Me.grbConfig.TabStop = False
            '
            'txtModel
            '
            Me.txtModel.Location = New System.Drawing.Point(52, 18)
            Me.txtModel.Name = "txtModel"
            Me.txtModel.Size = New System.Drawing.Size(100, 21)
            Me.txtModel.TabIndex = 28
            Me.txtModel.Text = "TP806"
            '
            'labPortName
            '
            Me.labPortName.Font = New System.Drawing.Font("宋体", 10.5!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(134, Byte))
            Me.labPortName.Location = New System.Drawing.Point(158, 21)
            Me.labPortName.Name = "labPortName"
            Me.labPortName.Size = New System.Drawing.Size(56, 20)
            Me.labPortName.TabIndex = 13
            Me.labPortName.Text = "Port:"
            '
            'label1
            '
            Me.label1.AutoSize = True
            Me.label1.ForeColor = System.Drawing.Color.DodgerBlue
            Me.label1.Location = New System.Drawing.Point(12, 198)
            Me.label1.Name = "label1"
            Me.label1.Size = New System.Drawing.Size(77, 12)
            Me.label1.TabIndex = 43
            Me.label1.Text = "Information:"
            '
            'PrtWinDemoForm
            '
            Me.ClientSize = New System.Drawing.Size(427, 308)
            Me.Controls.Add(Me.btnConnect)
            Me.Controls.Add(Me.btnClose)
            Me.Controls.Add(Me.btnStop)
            Me.Controls.Add(Me.grbBtn)
            Me.Controls.Add(Me.tboxInfo)
            Me.Controls.Add(Me.grbConfig)
            Me.Controls.Add(Me.label1)
            Me.Name = "PrtWinDemoForm"
            Me.Text = "DemoPrint"
            Me.tabPage1.ResumeLayout(False)
            Me.tabControl1.ResumeLayout(False)
            Me.tabPage2.ResumeLayout(False)
            Me.tabPage3.ResumeLayout(False)
            Me.tabPage4.ResumeLayout(False)
            Me.tabPage5.ResumeLayout(False)
            Me.TabPage6.ResumeLayout(False)
            Me.grbBtn.ResumeLayout(False)
            Me.grbConfig.ResumeLayout(False)
            Me.grbConfig.PerformLayout()
            Me.ResumeLayout(False)
            Me.PerformLayout()

        End Sub
        Public WithEvents btnWindowsFont As System.Windows.Forms.Button
        Public WithEvents lblModel As System.Windows.Forms.Label
        Public WithEvents tabPage1 As System.Windows.Forms.TabPage
        Public WithEvents btnPrintReceipt As System.Windows.Forms.Button
        Public WithEvents btnPrintLabel As System.Windows.Forms.Button
        Public WithEvents txtPortSetting As System.Windows.Forms.TextBox
        Public WithEvents cmbPortType As System.Windows.Forms.ComboBox
        Public WithEvents cmbImage As System.Windows.Forms.ComboBox
        Public WithEvents btnConnect As System.Windows.Forms.Button
        Public WithEvents tabControl1 As System.Windows.Forms.TabControl
        Public WithEvents tabPage2 As System.Windows.Forms.TabPage
        Public WithEvents btnPrint As System.Windows.Forms.Button
        Public WithEvents btnDownLoadImage As System.Windows.Forms.Button
        Public WithEvents tabPage3 As System.Windows.Forms.TabPage
        Public WithEvents btnRealTimeStatus As System.Windows.Forms.Button
        Public WithEvents btnDirectIO As System.Windows.Forms.Button
        Public WithEvents tabPage4 As System.Windows.Forms.TabPage
        Public WithEvents tabPage5 As System.Windows.Forms.TabPage
        Public WithEvents btnVersion As System.Windows.Forms.Button
        Public WithEvents btnClose As System.Windows.Forms.Button
        Public WithEvents btnStop As System.Windows.Forms.Button
        Public WithEvents grbBtn As System.Windows.Forms.GroupBox
        Public WithEvents tboxInfo As System.Windows.Forms.TextBox
        Public WithEvents grbConfig As System.Windows.Forms.GroupBox
        Public WithEvents labPortName As System.Windows.Forms.Label
        Public WithEvents label1 As System.Windows.Forms.Label
        Public WithEvents txtModel As System.Windows.Forms.TextBox
        Friend WithEvents TabPage6 As TabPage
        Friend WithEvents Button1 As Button
        Friend WithEvents btnSN As Button
    End Class

End Namespace
