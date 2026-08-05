namespace PrtWinDemo
{
    partial class PrtWinDemoForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.btnConnect = new System.Windows.Forms.Button();
            this.btnClose = new System.Windows.Forms.Button();
            this.btnStop = new System.Windows.Forms.Button();
            this.tboxInfo = new System.Windows.Forms.TextBox();
            this.txtPortSetting = new System.Windows.Forms.TextBox();
            this.grbBtn = new System.Windows.Forms.GroupBox();
            this.Number = new System.Windows.Forms.TabControl();
            this.tabPage1 = new System.Windows.Forms.TabPage();
            this.btnPrint_Line_Rectangle = new System.Windows.Forms.Button();
            this.btnPrintReceipt = new System.Windows.Forms.Button();
            this.btnPrintLabel = new System.Windows.Forms.Button();
            this.tabPage2 = new System.Windows.Forms.TabPage();
            this.btnPrint = new System.Windows.Forms.Button();
            this.btnDownLoadImage = new System.Windows.Forms.Button();
            this.cmbImage = new System.Windows.Forms.ComboBox();
            this.tabPage3 = new System.Windows.Forms.TabPage();
            this.btnRealTimeStatus = new System.Windows.Forms.Button();
            this.btnDirectIO = new System.Windows.Forms.Button();
            this.tabPage5 = new System.Windows.Forms.TabPage();
            this.btnSn = new System.Windows.Forms.Button();
            this.btnVersion = new System.Windows.Forms.Button();
            this.tabPage4 = new System.Windows.Forms.TabPage();
            this.textRead = new System.Windows.Forms.TextBox();
            this.textWrite = new System.Windows.Forms.TextBox();
            this.Read = new System.Windows.Forms.Button();
            this.tabPage6 = new System.Windows.Forms.TabPage();
            this.get_Number = new System.Windows.Forms.Button();
            this.lblModel = new System.Windows.Forms.Label();
            this.labPortName = new System.Windows.Forms.Label();
            this.cmbPortType = new System.Windows.Forms.ComboBox();
            this.grbConfig = new System.Windows.Forms.GroupBox();
            this.cmbModel = new System.Windows.Forms.ComboBox();
            this.label1 = new System.Windows.Forms.Label();
            this.grbBtn.SuspendLayout();
            this.Number.SuspendLayout();
            this.tabPage1.SuspendLayout();
            this.tabPage2.SuspendLayout();
            this.tabPage3.SuspendLayout();
            this.tabPage5.SuspendLayout();
            this.tabPage4.SuspendLayout();
            this.tabPage6.SuspendLayout();
            this.grbConfig.SuspendLayout();
            this.SuspendLayout();
            // 
            // btnConnect
            // 
            this.btnConnect.Location = new System.Drawing.Point(227, 61);
            this.btnConnect.Name = "btnConnect";
            this.btnConnect.Size = new System.Drawing.Size(75, 30);
            this.btnConnect.TabIndex = 3;
            this.btnConnect.Text = "Connect";
            this.btnConnect.Click += new System.EventHandler(this.btnConnect_Click);
            // 
            // btnClose
            // 
            this.btnClose.Location = new System.Drawing.Point(308, 268);
            this.btnClose.Name = "btnClose";
            this.btnClose.Size = new System.Drawing.Size(75, 30);
            this.btnClose.TabIndex = 4;
            this.btnClose.Text = "Close";
            this.btnClose.Click += new System.EventHandler(this.btnClose_Click);
            // 
            // btnStop
            // 
            this.btnStop.Location = new System.Drawing.Point(308, 61);
            this.btnStop.Name = "btnStop";
            this.btnStop.Size = new System.Drawing.Size(75, 30);
            this.btnStop.TabIndex = 9;
            this.btnStop.Text = "Stop";
            this.btnStop.Click += new System.EventHandler(this.btnStop_Click);
            // 
            // tboxInfo
            // 
            this.tboxInfo.ForeColor = System.Drawing.SystemColors.Highlight;
            this.tboxInfo.Location = new System.Drawing.Point(12, 212);
            this.tboxInfo.Multiline = true;
            this.tboxInfo.Name = "tboxInfo";
            this.tboxInfo.ReadOnly = true;
            this.tboxInfo.ScrollBars = System.Windows.Forms.ScrollBars.Vertical;
            this.tboxInfo.Size = new System.Drawing.Size(382, 51);
            this.tboxInfo.TabIndex = 11;
            // 
            // txtPortSetting
            // 
            this.txtPortSetting.Location = new System.Drawing.Point(241, 18);
            this.txtPortSetting.Name = "txtPortSetting";
            this.txtPortSetting.Size = new System.Drawing.Size(130, 21);
            this.txtPortSetting.TabIndex = 23;
            this.txtPortSetting.TextChanged += new System.EventHandler(this.txtPortSetting_TextChanged);
            // 
            // grbBtn
            // 
            this.grbBtn.Controls.Add(this.Number);
            this.grbBtn.Location = new System.Drawing.Point(12, 91);
            this.grbBtn.Name = "grbBtn";
            this.grbBtn.Size = new System.Drawing.Size(382, 100);
            this.grbBtn.TabIndex = 25;
            this.grbBtn.TabStop = false;
            this.grbBtn.Text = "Functions";
            // 
            // Number
            // 
            this.Number.Controls.Add(this.tabPage1);
            this.Number.Controls.Add(this.tabPage2);
            this.Number.Controls.Add(this.tabPage3);
            this.Number.Controls.Add(this.tabPage5);
            this.Number.Controls.Add(this.tabPage4);
            this.Number.Controls.Add(this.tabPage6);
            this.Number.Location = new System.Drawing.Point(11, 20);
            this.Number.Name = "Number";
            this.Number.SelectedIndex = 0;
            this.Number.Size = new System.Drawing.Size(360, 74);
            this.Number.TabIndex = 30;
            // 
            // tabPage1
            // 
            this.tabPage1.Controls.Add(this.btnPrint_Line_Rectangle);
            this.tabPage1.Controls.Add(this.btnPrintReceipt);
            this.tabPage1.Controls.Add(this.btnPrintLabel);
            this.tabPage1.Location = new System.Drawing.Point(4, 22);
            this.tabPage1.Name = "tabPage1";
            this.tabPage1.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage1.Size = new System.Drawing.Size(352, 48);
            this.tabPage1.TabIndex = 0;
            this.tabPage1.Text = "Print";
            this.tabPage1.UseVisualStyleBackColor = true;
            // 
            // btnPrint_Line_Rectangle
            // 
            this.btnPrint_Line_Rectangle.Location = new System.Drawing.Point(246, 11);
            this.btnPrint_Line_Rectangle.Name = "btnPrint_Line_Rectangle";
            this.btnPrint_Line_Rectangle.Size = new System.Drawing.Size(97, 23);
            this.btnPrint_Line_Rectangle.TabIndex = 23;
            this.btnPrint_Line_Rectangle.Text = "Line/Rectangle";
            this.btnPrint_Line_Rectangle.UseVisualStyleBackColor = true;
            this.btnPrint_Line_Rectangle.Click += new System.EventHandler(this.btnPrint_Line_Rectangle_Click);
            // 
            // btnPrintReceipt
            // 
            this.btnPrintReceipt.Location = new System.Drawing.Point(7, 12);
            this.btnPrintReceipt.Name = "btnPrintReceipt";
            this.btnPrintReceipt.Size = new System.Drawing.Size(97, 23);
            this.btnPrintReceipt.TabIndex = 22;
            this.btnPrintReceipt.Text = "Receipt";
            this.btnPrintReceipt.UseVisualStyleBackColor = true;
            this.btnPrintReceipt.Click += new System.EventHandler(this.btnPrintReceipt_Click);
            // 
            // btnPrintLabel
            // 
            this.btnPrintLabel.Location = new System.Drawing.Point(127, 11);
            this.btnPrintLabel.Name = "btnPrintLabel";
            this.btnPrintLabel.Size = new System.Drawing.Size(97, 23);
            this.btnPrintLabel.TabIndex = 10;
            this.btnPrintLabel.Text = "Label";
            this.btnPrintLabel.Click += new System.EventHandler(this.btnPrintLabel_Click);
            // 
            // tabPage2
            // 
            this.tabPage2.Controls.Add(this.btnPrint);
            this.tabPage2.Controls.Add(this.btnDownLoadImage);
            this.tabPage2.Controls.Add(this.cmbImage);
            this.tabPage2.Location = new System.Drawing.Point(4, 22);
            this.tabPage2.Name = "tabPage2";
            this.tabPage2.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage2.Size = new System.Drawing.Size(352, 48);
            this.tabPage2.TabIndex = 1;
            this.tabPage2.Text = "Image";
            this.tabPage2.UseVisualStyleBackColor = true;
            // 
            // btnPrint
            // 
            this.btnPrint.Enabled = false;
            this.btnPrint.Location = new System.Drawing.Point(257, 9);
            this.btnPrint.Name = "btnPrint";
            this.btnPrint.Size = new System.Drawing.Size(75, 30);
            this.btnPrint.TabIndex = 35;
            this.btnPrint.Text = "Print";
            this.btnPrint.UseVisualStyleBackColor = true;
            this.btnPrint.Click += new System.EventHandler(this.btnPrint_Click);
            // 
            // btnDownLoadImage
            // 
            this.btnDownLoadImage.Location = new System.Drawing.Point(158, 9);
            this.btnDownLoadImage.Name = "btnDownLoadImage";
            this.btnDownLoadImage.Size = new System.Drawing.Size(75, 30);
            this.btnDownLoadImage.TabIndex = 34;
            this.btnDownLoadImage.Text = "Download";
            this.btnDownLoadImage.UseVisualStyleBackColor = true;
            this.btnDownLoadImage.Click += new System.EventHandler(this.btnDownLoadImage_Click);
            // 
            // cmbImage
            // 
            this.cmbImage.FormattingEnabled = true;
            this.cmbImage.Items.AddRange(new object[] {
            "RasterImage",
            "BufferedImage",
            "NVImage"});
            this.cmbImage.Location = new System.Drawing.Point(6, 15);
            this.cmbImage.Name = "cmbImage";
            this.cmbImage.Size = new System.Drawing.Size(140, 20);
            this.cmbImage.TabIndex = 33;
            // 
            // tabPage3
            // 
            this.tabPage3.Controls.Add(this.btnRealTimeStatus);
            this.tabPage3.Controls.Add(this.btnDirectIO);
            this.tabPage3.Location = new System.Drawing.Point(4, 22);
            this.tabPage3.Name = "tabPage3";
            this.tabPage3.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage3.Size = new System.Drawing.Size(352, 48);
            this.tabPage3.TabIndex = 2;
            this.tabPage3.Text = "Status";
            this.tabPage3.UseVisualStyleBackColor = true;
            // 
            // btnRealTimeStatus
            // 
            this.btnRealTimeStatus.Location = new System.Drawing.Point(51, 9);
            this.btnRealTimeStatus.Name = "btnRealTimeStatus";
            this.btnRealTimeStatus.Size = new System.Drawing.Size(89, 30);
            this.btnRealTimeStatus.TabIndex = 15;
            this.btnRealTimeStatus.Text = "State";
            this.btnRealTimeStatus.Click += new System.EventHandler(this.btnState_Click);
            // 
            // btnDirectIO
            // 
            this.btnDirectIO.Location = new System.Drawing.Point(208, 9);
            this.btnDirectIO.Name = "btnDirectIO";
            this.btnDirectIO.Size = new System.Drawing.Size(89, 30);
            this.btnDirectIO.TabIndex = 24;
            this.btnDirectIO.Text = "Other";
            this.btnDirectIO.UseVisualStyleBackColor = true;
            this.btnDirectIO.Click += new System.EventHandler(this.btnDirectIO_Click);
            // 
            // tabPage5
            // 
            this.tabPage5.Controls.Add(this.btnSn);
            this.tabPage5.Controls.Add(this.btnVersion);
            this.tabPage5.Location = new System.Drawing.Point(4, 22);
            this.tabPage5.Name = "tabPage5";
            this.tabPage5.Size = new System.Drawing.Size(352, 48);
            this.tabPage5.TabIndex = 4;
            this.tabPage5.Text = "Version/Sn";
            this.tabPage5.UseVisualStyleBackColor = true;
            // 
            // btnSn
            // 
            this.btnSn.Location = new System.Drawing.Point(187, 9);
            this.btnSn.Name = "btnSn";
            this.btnSn.Size = new System.Drawing.Size(88, 30);
            this.btnSn.TabIndex = 32;
            this.btnSn.Text = "SN";
            this.btnSn.UseVisualStyleBackColor = true;
            this.btnSn.Click += new System.EventHandler(this.btnSn_Click);
            // 
            // btnVersion
            // 
            this.btnVersion.Location = new System.Drawing.Point(48, 9);
            this.btnVersion.Name = "btnVersion";
            this.btnVersion.Size = new System.Drawing.Size(84, 30);
            this.btnVersion.TabIndex = 31;
            this.btnVersion.Text = "Version";
            this.btnVersion.UseVisualStyleBackColor = true;
            this.btnVersion.Click += new System.EventHandler(this.btnVersion_Click);
            // 
            // tabPage4
            // 
            this.tabPage4.Controls.Add(this.textRead);
            this.tabPage4.Controls.Add(this.textWrite);
            this.tabPage4.Controls.Add(this.Read);
            this.tabPage4.Location = new System.Drawing.Point(4, 22);
            this.tabPage4.Name = "tabPage4";
            this.tabPage4.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage4.Size = new System.Drawing.Size(352, 48);
            this.tabPage4.TabIndex = 5;
            this.tabPage4.Text = "Write/Read";
            this.tabPage4.UseVisualStyleBackColor = true;
            // 
            // textRead
            // 
            this.textRead.CausesValidation = false;
            this.textRead.Location = new System.Drawing.Point(3, 25);
            this.textRead.Name = "textRead";
            this.textRead.Size = new System.Drawing.Size(197, 21);
            this.textRead.TabIndex = 3;
            this.textRead.TextChanged += new System.EventHandler(this.textRead_TextChanged);
            // 
            // textWrite
            // 
            this.textWrite.Location = new System.Drawing.Point(2, 3);
            this.textWrite.Name = "textWrite";
            this.textWrite.Size = new System.Drawing.Size(198, 21);
            this.textWrite.TabIndex = 2;
            this.textWrite.TextChanged += new System.EventHandler(this.textWrite_TextChanged);
            // 
            // Read
            // 
            this.Read.Location = new System.Drawing.Point(274, 25);
            this.Read.Name = "Read";
            this.Read.Size = new System.Drawing.Size(75, 23);
            this.Read.TabIndex = 1;
            this.Read.Text = "Read";
            this.Read.UseVisualStyleBackColor = true;
            this.Read.Click += new System.EventHandler(this.btnRead_Click);
            // 
            // tabPage6
            // 
            this.tabPage6.Controls.Add(this.get_Number);
            this.tabPage6.Location = new System.Drawing.Point(4, 22);
            this.tabPage6.Name = "tabPage6";
            this.tabPage6.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage6.Size = new System.Drawing.Size(352, 48);
            this.tabPage6.TabIndex = 6;
            this.tabPage6.Text = "Number";
            this.tabPage6.UseVisualStyleBackColor = true;
            // 
            // get_Number
            // 
            this.get_Number.Location = new System.Drawing.Point(132, 12);
            this.get_Number.Name = "get_Number";
            this.get_Number.Size = new System.Drawing.Size(75, 23);
            this.get_Number.TabIndex = 0;
            this.get_Number.Text = "get_Number";
            this.get_Number.UseVisualStyleBackColor = true;
            this.get_Number.Click += new System.EventHandler(this.get_Number_Click);
            // 
            // lblModel
            // 
            this.lblModel.AutoSize = true;
            this.lblModel.Font = new System.Drawing.Font("宋体", 10.5F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(134)));
            this.lblModel.Location = new System.Drawing.Point(8, 21);
            this.lblModel.Name = "lblModel";
            this.lblModel.Size = new System.Drawing.Size(49, 14);
            this.lblModel.TabIndex = 27;
            this.lblModel.Text = "Model:";
            // 
            // labPortName
            // 
            this.labPortName.Font = new System.Drawing.Font("宋体", 10.5F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(134)));
            this.labPortName.Location = new System.Drawing.Point(135, 21);
            this.labPortName.Name = "labPortName";
            this.labPortName.Size = new System.Drawing.Size(56, 20);
            this.labPortName.TabIndex = 13;
            this.labPortName.Text = "Port:";
            // 
            // cmbPortType
            // 
            this.cmbPortType.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left)));
            this.cmbPortType.Items.AddRange(new object[] {
            "Net",
            "USB",
            "LPT",
            "COM"});
            this.cmbPortType.Location = new System.Drawing.Point(173, 18);
            this.cmbPortType.Name = "cmbPortType";
            this.cmbPortType.Size = new System.Drawing.Size(62, 20);
            this.cmbPortType.TabIndex = 6;
            this.cmbPortType.SelectedIndexChanged += new System.EventHandler(this.cmbPortType_SelectedIndexChanged);
            // 
            // grbConfig
            // 
            this.grbConfig.Controls.Add(this.cmbModel);
            this.grbConfig.Controls.Add(this.lblModel);
            this.grbConfig.Controls.Add(this.txtPortSetting);
            this.grbConfig.Controls.Add(this.cmbPortType);
            this.grbConfig.Controls.Add(this.labPortName);
            this.grbConfig.Location = new System.Drawing.Point(12, 8);
            this.grbConfig.Name = "grbConfig";
            this.grbConfig.Size = new System.Drawing.Size(382, 47);
            this.grbConfig.TabIndex = 28;
            this.grbConfig.TabStop = false;
            // 
            // cmbModel
            // 
            this.cmbModel.FormattingEnabled = true;
            this.cmbModel.Items.AddRange(new object[] {
            "TP801",
            "TP805",
            "TP806",
            "MLP2",
            "HM-E200",
            "PT562"});
            this.cmbModel.Location = new System.Drawing.Point(53, 18);
            this.cmbModel.Name = "cmbModel";
            this.cmbModel.Size = new System.Drawing.Size(80, 20);
            this.cmbModel.TabIndex = 30;
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.ForeColor = System.Drawing.Color.DodgerBlue;
            this.label1.Location = new System.Drawing.Point(12, 194);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(77, 12);
            this.label1.TabIndex = 29;
            this.label1.Text = "Information:";
            // 
            // PrtWinDemoForm
            // 
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Inherit;
            this.AutoScroll = true;
            this.ClientSize = new System.Drawing.Size(405, 301);
            this.Controls.Add(this.grbConfig);
            this.Controls.Add(this.grbBtn);
            this.Controls.Add(this.tboxInfo);
            this.Controls.Add(this.btnConnect);
            this.Controls.Add(this.btnClose);
            this.Controls.Add(this.btnStop);
            this.Controls.Add(this.label1);
            this.Name = "PrtWinDemoForm";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
            this.Text = "PrtWinDemoForm";
            this.grbBtn.ResumeLayout(false);
            this.Number.ResumeLayout(false);
            this.tabPage1.ResumeLayout(false);
            this.tabPage2.ResumeLayout(false);
            this.tabPage3.ResumeLayout(false);
            this.tabPage5.ResumeLayout(false);
            this.tabPage4.ResumeLayout(false);
            this.tabPage4.PerformLayout();
            this.tabPage6.ResumeLayout(false);
            this.grbConfig.ResumeLayout(false);
            this.grbConfig.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Button btnConnect;
        private System.Windows.Forms.Button btnClose;
        private System.Windows.Forms.Button btnStop;
        private System.Windows.Forms.TextBox tboxInfo;
        private System.Windows.Forms.TextBox txtPortSetting;
        private System.Windows.Forms.GroupBox grbBtn;
        private System.Windows.Forms.Label lblModel;
        private System.Windows.Forms.Label labPortName;
        private System.Windows.Forms.ComboBox cmbPortType;
        private System.Windows.Forms.GroupBox grbConfig;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.ComboBox cmbModel;
        private System.Windows.Forms.TabControl Number;
        private System.Windows.Forms.TabPage tabPage1;
        private System.Windows.Forms.Button btnPrintReceipt;
        private System.Windows.Forms.Button btnPrintLabel;
        private System.Windows.Forms.TabPage tabPage2;
        private System.Windows.Forms.Button btnPrint;
        private System.Windows.Forms.Button btnDownLoadImage;
        private System.Windows.Forms.ComboBox cmbImage;
        private System.Windows.Forms.TabPage tabPage3;
        private System.Windows.Forms.Button btnRealTimeStatus;
        private System.Windows.Forms.Button btnDirectIO;
        private System.Windows.Forms.TabPage tabPage5;
        private System.Windows.Forms.Button btnVersion;
        private System.Windows.Forms.Button btnPrint_Line_Rectangle;
        private System.Windows.Forms.TabPage tabPage4;
        private System.Windows.Forms.TextBox textRead;
        private System.Windows.Forms.TextBox textWrite;
        private System.Windows.Forms.Button Read;
        private System.Windows.Forms.TabPage tabPage6;
        private System.Windows.Forms.Button get_Number;
        private System.Windows.Forms.Button btnSn;
    }
}

