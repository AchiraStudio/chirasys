Imports System
Imports System.Collections.Generic
Imports System.ComponentModel
Imports System.Data
Imports System.Drawing
Imports System.Text
Imports System.Windows.Forms
Imports System.Runtime.InteropServices
Imports System.IO.Ports
Imports System.Text.RegularExpressions

Namespace Demo.Printer
    Public Class PrtWinDemoForm
        Inherits Form
        Public PageModePrinterList As New List(Of String)()
        Private printer As DemoPrinter = Nothing
        Private isPageModePrinter As Boolean
        Private imagePath As String
        Private Index As Integer
        Public Sub New()
            InitializeComponent()
            setButtonEnable(False)
            Me.cmbPortType.SelectedIndex = 0
            Me.txtPortSetting.Text = "USB"
            Me.cmbImage.SelectedIndex = 0
        End Sub
        Private Sub setButtonEnable(ByVal isEnable As Boolean)
            btnConnect.Enabled = Not isEnable
            btnStop.Enabled = isEnable
            Me.grbBtn.Enabled = isEnable
        End Sub
        Private Sub btnClose_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnClose.Click
            Me.Close()
        End Sub
        Private Sub btnConnect_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnConnect.Click
            Dim modelsetting As String = Me.txtModel.Text
            Dim portsetting As String = Me.txtPortSetting.Text
            If printer Is Nothing Then
                printer = New DemoPrinter(modelsetting)
                If printer Is Nothing Then
                    MessageBox.Show("Creator Model Failed!")
                    Return
                End If
            Else
                printer.Model = modelsetting
            End If
            If Constants.E_SUCCESS = printer.DemPortOpen(portsetting) Then
                Me.tboxInfo.Text = "Connect Succeed"
                setButtonEnable(True)
                PageModePrinterList.Add(modelsetting)
                isPageModePrinter = PageModePrinterList.Contains(modelsetting)
                If Not isPageModePrinter Then
                    Me.btnPrintLabel.Enabled = False
                End If
            Else
                MessageBox.Show("Port Open Failed!")
            End If
        End Sub
        Private Sub btnStop_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnStop.Click
            Me.tboxInfo.Text = "Close Port"
            printer.DemPortClose()
            setButtonEnable(False)
        End Sub
        Private Sub btnPrintLabel_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnPrintLabel.Click
            Dim vMotion As Double = 0.0625, hMotion As Double = 0.125
            Dim pageWidth As Integer = 70, pageHeight As Integer = 500
            Dim width_dots As Integer = CType((pageWidth / hMotion), Integer)
            Dim height_dots As Integer = CType((pageHeight / vMotion), Integer)
            If CheckPrinterState() Then
                printer.Initialize()
                printer.DemSelectPageMode()
                printer.DemSetPageModePrintArea(0, 0, width_dots, height_dots)
                printer.DemSetPageModePrintDirection(Constants.PRINT_DIRECTION_LEFT_TO_RIGHT)


                'Print CODE128
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(96)
                printer.DemPrintBarCode(Constants.BARCODE_CODE128, "{A1101123456789", 1, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW)

                'Print EAN13
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(300)
                printer.DemPrintBarCode(Constants.BARCODE_EAN13, "2501138000002", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW)

                'Print QRCODE1
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(400)
                printer.DemPrintBarCode(Constants.SYMBOL_QRCODE1, "QRCODE 1 654321", 5, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_NONE)

                'Print QRCODE2
                printer.DemSetPageModeHorizontalPosition(200)
                printer.DemSetPageModeVerticalPosition(400)
                printer.DemPrintBarCode(Constants.SYMBOL_QRCODE2, "QRCODE 2 123456", 5, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_NONE)

                'Print PDF417
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(750)
                printer.DemPrintSymbol(Constants.SYMBOL_STANDARD_PDF417, "China 0123456 ABC +_*&", Constants.PDF417_ERROR_CORRECTION_LEVEL_0, 3, 2, Constants.ALIGNMENT_LEFT)


                'Print UPC-A
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(1150)
                printer.DemPrintBarCode(Constants.BARCODE_UPC_A, "023150456784", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW)

                'Print UPC-E
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(1350)
                printer.DemPrintBarCode(Constants.BARCODE_UPC_E, "01220000899", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW)

                'Print EAN8
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(1550)
                printer.DemPrintBarCode(Constants.BARCODE_EAN8, "1542656", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW)

                'Print CODE39
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(1850)
                printer.DemPrintBarCode(Constants.BARCODE_CODE39, "*10401YY00002009*", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW)

                'Print ITF
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(2050)
                printer.DemPrintBarCode(Constants.BARCODE_ITF, "11231111032125", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW)

                'Print CODEBAR
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(2250)
                printer.DemPrintBarCode(Constants.BARCODE_CODABAR, "A40156A", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW)

                'Print CODE93
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(2450)
                printer.DemPrintBarCode(Constants.BARCODE_CODE93, "*CODE930093*", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW)

                'Print Text
                printer.DemSetPageModeHorizontalPosition(20)
                printer.DemSetPageModeVerticalPosition(2600)
                printer.DemPrintText("PRINT TEXT TEST" & vbLf, Constants.ALIGNMENT_LEFT, Constants.TEXT_FONT_BOLD, Constants.TEXT_SIZE_1WIDTH Or Constants.TEXT_SIZE_1HEIGHT)


                printer.DemPrintAndReturnStandardMode()
            End If
        End Sub
        Private Sub btnDirectIO_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnDirectIO.Click
            Dim writedata As Byte() = New Byte() {&H1D, &H72, &H1}
            Dim readnum As Integer = 0
            Dim readdata As Byte() = New Byte(1) {}
            printer.DemDirectIO(writedata, readdata, readdata.Length, readnum)
            If readnum > 0 Then
                Me.tboxInfo.Text = ""
                Dim i As Integer = 0
                While i < readnum
                    tboxInfo.Text += Convert.ToString(readdata(i), 16) + " "
                    System.Math.Max(System.Threading.Interlocked.Increment(i), i - 1)
                End While
            End If
        End Sub
        Private Sub btnState_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnRealTimeStatus.Click
            Dim printer_state As UInteger = 0
            printer.DemGetPrinterState(printer_state)
            If Constants.STS_NORMAL = printer_state Then
                tboxInfo.Text = "Printer state is normal."
            Else
                CheckPrinterState()
            End If
        End Sub
        Private Sub btnPrintReceipt_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnPrintReceipt.Click
            If CheckPrinterState() Then
                printer.Initialize()
                'printer.PrintNVImageCompatible(1, 1)
                printer.DemPrintText("Receipt" & vbLf, Constants.ALIGNMENT_CENTER, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_1WIDTH Or Constants.TEXT_SIZE_1HEIGHT)
                printer.DemPrintText("09/27/2014" & vbLf, Constants.ALIGNMENT_CENTER, Constants.TEXT_FONT_BOLD, Constants.TEXT_SIZE_1WIDTH Or Constants.TEXT_SIZE_1HEIGHT)
                printer.DemPrintText("LG-67441634" & vbLf, Constants.ALIGNMENT_CENTER, Constants.TEXT_FONT_BOLD, Constants.TEXT_SIZE_1WIDTH Or Constants.TEXT_SIZE_1HEIGHT)
                printer.DemPrintText(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss " & vbLf), Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH Or Constants.TEXT_SIZE_0HEIGHT)
                printer.DemPrintText("Random Code：1234     Total：150" & vbLf, Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH Or Constants.TEXT_SIZE_0HEIGHT)
                printer.DemPrintText("Seller:12345678" & vbLf, Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH Or Constants.TEXT_SIZE_0HEIGHT)
                printer.DemPrintBarCode(Constants.BARCODE_CODE128, "{B10306AB100010", 2, 50, Constants.ALIGNMENT_CENTER, Constants.BARCODE_HRI_BELOW)
                printer.DemPrintText("001  Number:214102201002" & vbLf, Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH Or Constants.TEXT_SIZE_0HEIGHT)
                'rinter.DemFeedLine(2)
                printer.DemCutPaper(Constants.FULL_CUT, 10)
            End If
        End Sub
        Private Function CheckPrinterState() As Boolean
            Dim printerState As New PrinterState()
            printer.GetState(printerState)
            tboxInfo.Text = ""
            If printerState.PAPEREMPTY = True Then
                tboxInfo.Text = "Printer paper not present,please insert the printing paper."
                Return False
            End If
            If printerState.COVEROPEN = True Then
                tboxInfo.Text = "Printer paper cover open,please check paper cover."
                Return False
            End If
            If printerState.PAPERNEAREND = True Then
                tboxInfo.Text = "Printer paper near end,please insert the printing paper."
            End If
            If printerState.MSR_READY = True Then
            End If
            If printerState.SMARTCARD_READY = True Then
            End If
            If printerState.[ERROR] = True Then
                tboxInfo.Text = "Printer state error,please verify printer communication is normal."
                Return False
            End If
            If printerState.NOT_OPEN = True Then
                tboxInfo.Text = "Printer port not open."
                Return False
            End If
            If printerState.OFFLINE = True Then
                tboxInfo.Text = "Printer offline,please check the priner state."
                Return False
            End If
            If printerState.ONBUSY = True Then
                tboxInfo.Text = "Printer busy."
                Return False
            End If
            Return True
        End Function
        Private Sub cmbPortType_SelectedIndexChanged(ByVal sender As Object, ByVal e As EventArgs) Handles cmbPortType.SelectedIndexChanged
            Dim porttype As String = Me.cmbPortType.Text.ToUpper()
            If "COM" = porttype Then
                Me.txtPortSetting.Text = "COM3,BAUDRATE_9600"
            ElseIf "NET" = porttype Then
                Me.txtPortSetting.Text = "Net,192.168.1.37"
            ElseIf "USB" = porttype Then
                Me.txtPortSetting.Text = "USB"
            ElseIf "LPT" = porttype Then
                Me.txtPortSetting.Text = "LPT1"
            Else
                Me.txtPortSetting.Text = "Invalid"
            End If
        End Sub
        Private Sub btnWinFont_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnWindowsFont.Click
            If CheckPrinterState() Then
                Dim imgepath As String = Application.StartupPath + "\sample.bmp"
                printer.PrintText2Image(imgepath, "打印测试", FontStyle.Regular, 25)
                printer.PrintText2Image(imgepath, " اختبار الطباعة ", FontStyle.Underline, 25)
                printer.PrintText2Image(imgepath, "กรุณาเปิดดูวิดีโอใ", FontStyle.Bold, 25)
                printer.PrintText2Image(imgepath, "프린터 시험", FontStyle.Strikeout, 40)
            End If
        End Sub
        Private Sub btnVersion_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnVersion.Click
            Dim Version As Integer() = New Integer(3) {}
            If Constants.E_SUCCESS = printer.DemGetFirmwareVersion(Version) Then
                MessageBox.Show("Printer FirmwareVersion:" + Version(0).ToString() + "." + Version(1).ToString() + "." + Version(2).ToString())
            End If
        End Sub
        Private Sub btnDownLoadImage_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnDownLoadImage.Click
            Dim printer_state As UInteger = 0
            printer.DemGetPrinterState(printer_state)
            If Constants.STS_NORMAL = printer_state Then
                Dim result As Integer = 0
                Dim dlg As New OpenFileDialog()
                dlg.Filter = "Image files|*.bmp;*.gif;*.jpg;*.png;"
                Dim imgMethod As String = Me.cmbImage.Text
                If dlg.ShowDialog() = DialogResult.OK Then
                    Dim fname As String = dlg.FileName
                    Dim ck1 As Byte = "1"
                    Dim ck2 As Byte = "0"
                    If "Image" = imgMethod Then
                        imagePath = fname
                    ElseIf "BufferedImage" = imgMethod Then
                        result = printer.DemDefineBufferedImage(fname)
                    ElseIf "NVImage" = imgMethod Then
                        result = printer.DemDefineNVImage(fname, ck1, ck1)
                    End If
                End If
                Index = Me.cmbImage.SelectedIndex
                If Constants.E_SUCCESS = result Then
                    MessageBox.Show("DownLoad Succeed.")
                    btnPrint.Enabled = True
                Else
                    MessageBox.Show("DownLoad Failed." + result.ToString())
                    btnPrint.Enabled = False
                End If
            End If
        End Sub
        Private Sub btnPrint_Click(ByVal sender As Object, ByVal e As EventArgs) Handles btnPrint.Click
            Dim ck1 As Byte = "1"
            Select Case Index
                Case 0
                    printer.DemPrintImage(imagePath, 0)
                    btnPrint.Enabled = False
                    Exit Select
                Case 1
                    printer.DemPrintBufferedImage()
                    btnPrint.Enabled = False
                    Exit Select
                Case 2
                    printer.DemPrintNVImage(ck1, ck1)
                    Exit Select
                Case Else
                    Exit Select
            End Select
        End Sub

        Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click
            Dim strEndInfomation As New StringBuilder("")
            Dim readNum As Integer
            Dim result As Integer
            readNum = -1
            result = 1
            result = printer.DemGetPaperFeedLinesNumber(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Paper Feed Lines Number = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Paper Feed Lines Number fail = " & result)
                strEndInfomation.AppendLine()
            End If

            readNum = -1
            result = 1
            result = printer.DemGetHeadEnergizingStrokesNumber(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Head Energizing Strokes Number = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Head Energizing Strokes Number fail = " & result)
                strEndInfomation.AppendLine()
            End If

            'readNum = -1
            'result = 1
            'Dim clearType As Integer
            'clearType = 0
            'result = printer.DemClearPrinterMileage(clearType)
            'If result = 0 Then
            '    strEndInfomation.Append("Clear Printing Mileage success ")
            '    strEndInfomation.AppendLine()
            'Else
            '    strEndInfomation.Append("Clear Printing Mileage success fail")
            '    strEndInfomation.AppendLine()
            'End If

            readNum = -1
            result = 1
            result = printer.DemGetAutocutterOperationsNumber(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Autocutter Operations Number = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Autocutter Operations Number fail = " & result)
                strEndInfomation.AppendLine()
            End If

            readNum = -1
            result = 1
            result = printer.DemGetPrinterOperationPeriod(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Printer Operation Period = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Printer Operation Period fail = " & result)
                strEndInfomation.AppendLine()
            End If

            readNum = -1
            result = 1
            result = printer.DemGetOverTemperatureErrorReportNumber(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Over Temperature Error Report Number = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Over Temperature Error Report Number fail = " & result)
                strEndInfomation.AppendLine()
            End If

            readNum = -1
            result = 1
            result = printer.DemGetPrinterPointsNumber(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Printer Points Number = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Printer Points Number fail = " & result)
                strEndInfomation.AppendLine()
            End If

            readNum = -1
            result = 1
            result = printer.DemGetCutterErrorNumber(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Cutter Error Number = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Cutter Error Number fail = " & result)
                strEndInfomation.AppendLine()
            End If

            readNum = -1
            result = 1
            result = printer.DemGetPowerOnOpenCoverNumber(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Power On Open Cover Number = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Power On Open Cover Number fail = " & result)
                strEndInfomation.AppendLine()
            End If

            readNum = -1
            result = 1
            result = printer.DemGetHalfCutNumber(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Half Cut Number = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Half Cut Number fail = " & result)
                strEndInfomation.AppendLine()
            End If

            readNum = -1
            result = 1
            result = printer.DemGetTotalCutNumber(readNum)
            If result = 0 Then
                strEndInfomation.Append("Get Total Cut Number = " & readNum)
                strEndInfomation.AppendLine()
            Else
                strEndInfomation.Append("Get Total Cut Number fail = " & result)
                strEndInfomation.AppendLine()
            End If

            'readNum = -1
            'result = 1
            'result = printer.DemClearPrinterMileage2()
            'If result = 0 Then
            '    strEndInfomation.Append("Clear Printing Mileage2 success ")
            '    strEndInfomation.AppendLine()
            'Else
            '    strEndInfomation.Append("Clear Printing Mileage2 success fail")
            '    strEndInfomation.AppendLine()
            'End If

            MessageBox.Show(strEndInfomation.ToString())
        End Sub

        Private Sub btnSN_Click(sender As Object, e As EventArgs) Handles btnSN.Click
            Dim arrSN As Byte() = New Byte(64) {}
            Dim SnLenth As Integer = 0
            If Constants.E_SUCCESS = printer.DemGetPrinterSN(arrSN, SnLenth) Then
                Dim str As String = Encoding.UTF8.GetString(arrSN)
                MessageBox.Show("Printer SN:" + str)
            End If
        End Sub
    End Class
End Namespace
