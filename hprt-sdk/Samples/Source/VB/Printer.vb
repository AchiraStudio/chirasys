Imports System
Imports System.Collections.Generic
Imports System.Text
Imports System.Runtime.InteropServices
Imports System.Windows.Forms
Imports System.Drawing
Namespace Demo.Printer
    Public Class PrinterState
        Public Shared ReadOnly STS_NORMAL As UInteger = &H0
        Public Shared ReadOnly STS_PAPEREMPTY As UInteger = 1
        Public Shared ReadOnly STS_COVEROPEN As UInteger = 2
        Public Shared ReadOnly STS_PAPERNEAREND As UInteger = 4
        Public Shared ReadOnly STS_MSR_READY As UInteger = 8
        Public Shared ReadOnly STS_SMARTCARD_READY As UInteger = 16
        Public Shared ReadOnly STS_ERROR As UInteger = 32
        Public Shared ReadOnly STS_NOT_OPEN As UInteger = 64
        Public Shared ReadOnly STS_OFFLINE As UInteger = 128
        Public Shared ReadOnly STS_ONBUSY As UInteger = 256
        Private m_status As UInteger = 0
        Public Sub New()
            m_status = 0
        End Sub
        Public Property State() As UInteger
            Get
                Return m_status
            End Get
            Set(ByVal value As UInteger)
                m_status = value
            End Set
        End Property
        Public ReadOnly Property IsNormal() As Boolean
            Get
                Return (STS_NORMAL = m_status)
            End Get
        End Property
        Public ReadOnly Property InError() As Boolean
            Get
                Return (PAPEREMPTY OrElse COVEROPEN OrElse PAPERNEAREND OrElse MSR_READY OrElse SMARTCARD_READY OrElse [ERROR] OrElse NOT_OPEN OrElse OFFLINE)
            End Get
        End Property
        Public ReadOnly Property PAPEREMPTY() As Boolean
            Get
                Return ((STS_PAPEREMPTY And m_status) > 0)
            End Get
        End Property
        Public ReadOnly Property COVEROPEN() As Boolean
            Get
                Return ((STS_COVEROPEN And m_status) > 0)
            End Get
        End Property
        Public ReadOnly Property PAPERNEAREND() As Boolean
            Get
                Return ((STS_PAPERNEAREND And m_status) > 0)
            End Get
        End Property
        Public ReadOnly Property MSR_READY() As Boolean
            Get
                Return ((STS_MSR_READY And m_status) > 0)
            End Get
        End Property
        Public ReadOnly Property SMARTCARD_READY() As Boolean
            Get
                Return ((STS_SMARTCARD_READY And m_status) > 0)
            End Get
        End Property
        Public ReadOnly Property [ERROR]() As Boolean
            Get
                Return ((STS_ERROR And m_status) > 0)
            End Get
        End Property
        Public ReadOnly Property NOT_OPEN() As Boolean
            Get
                Return ((STS_NOT_OPEN And m_status) > 0)
            End Get
        End Property
        Public ReadOnly Property OFFLINE() As Boolean
            Get
                Return ((STS_OFFLINE And m_status) > 0)
            End Get
        End Property
        Public ReadOnly Property ONBUSY() As Boolean
            Get
                Return ((STS_ONBUSY And m_status) > 0)
            End Get
        End Property
    End Class
    Public Class DemoPrinter
        Public Const HPRTDIR As String = "ESC_SDK.dll"
        'Public Const charSet As CharSet = Runtime.InteropServices.CharSet.Unicode
        Public Const charSet As CharSet = Runtime.InteropServices.CharSet.Ansi



        Public Const callType As CallingConvention = CallingConvention.StdCall

        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=callType)> _
        Private Shared Function FormatError(ByVal error_no As Integer, ByVal langid As Integer, ByVal buf As Byte(), ByVal pos As Integer, ByVal bufSize As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=callType)> _
        Private Shared Function PrinterCreator(ByRef printer As IntPtr, ByVal model As String) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=callType)> _
        Private Shared Function PrinterCreatorS(ByVal model As String) As IntPtr
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function PrinterDestroy(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=callType)> _
        Private Shared Function PortOpen(ByVal printer As IntPtr, ByVal portSetting As String) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function PortClose(ByVal printer As IntPtr) As Integer
        End Function

        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function DirectIO(ByVal printer As IntPtr, ByVal writeData As Byte(), ByVal writenum As Integer, ByVal readData As Byte(), ByVal readNum As Integer, ByRef readedNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function PrinterInitialize(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function FeedLine(ByVal printer As IntPtr, ByVal lines As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SetAlign(ByVal printer As IntPtr, ByVal align As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=callType)> _
        Private Shared Function PrintText(ByVal printer As IntPtr, ByVal data As Byte(), ByVal alignment As Integer, ByVal attribute As Integer, ByVal textSize As Integer) As Integer
        End Function

        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=callType)> _
        Private Shared Function PrintTextS(ByVal printer As IntPtr, ByVal text As Byte()) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=callType)> _
        Private Shared Function PrintBarCode(ByVal printer As IntPtr, ByVal bcType As Integer, ByVal bcData As String, ByVal width As Integer, ByVal height As Integer, ByVal alignment As Integer, _
   ByVal hriPosition As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=callType)> _
        Private Shared Function PrintSymbol(ByVal printer As IntPtr, ByVal type As Integer, ByVal bcData As String, ByVal errLevel As Integer, ByVal width As Integer, ByVal height As Integer, _
   ByVal alignment As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function CutPaper(ByVal printer As IntPtr, ByVal cutMode As Integer, ByVal distance As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function OpenCashDrawer(ByVal printer As IntPtr, ByVal pinMode As Integer, ByVal onTime As Integer, ByVal offTime As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SelectStandardMode(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SetTextLineSpace(ByVal printer As IntPtr, ByVal lineSpace As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SetTextBold(ByVal printer As IntPtr, ByVal bold As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SetTextFont(ByVal printer As IntPtr, ByVal Font As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SelectPageMode(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SetPrintAreaInPageMode(ByVal printer As IntPtr, ByVal horizontal As Integer, ByVal vertical As Integer, ByVal width As Integer, ByVal height As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function CancelPrintDataInPageMode(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SelectPrintDirectionInPageMode(ByVal printer As IntPtr, ByVal direction As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SetAbsolutePrintPosition(ByVal printer As IntPtr, ByVal position As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=callType)> _
        Private Shared Function SetAbsoluteVerticalPrintPositionInPageMode(ByVal printer As IntPtr, ByVal position As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function PrintAndReturnStandardMode(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function PositionNextLabel(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function PrintDataInPageMode(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function GetPrinterState(ByVal printer As IntPtr, ByRef printerState As UInteger) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function SetHorizontalAndVerticalMotionUnits(ByVal printer As IntPtr, ByVal horizaotal As Integer, ByVal vertical As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function SetCodePage(ByVal printer As IntPtr, ByVal codepage As Integer, ByVal type As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function SetBuzzer(ByVal printer As IntPtr, ByVal enable As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function SetInternationalCharacter(ByVal printer As IntPtr, ByVal characterSet As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function SetPrintSpeed(ByVal printer As IntPtr, ByVal speed As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet)> _
        Private Shared Function DefineNVImageCompatible(ByVal printer As IntPtr, ByVal imagePath As String(), ByVal imageCnt As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function PrintNVImageCompatible(ByVal printer As IntPtr, ByVal imageNo As Integer, ByVal scaleMode As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function DefineDownloadedImageCompatible(ByVal printer As IntPtr, ByVal imagePath As String) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function PrintDownloadedImageCompatible(ByVal printer As IntPtr, ByVal scaleMode As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function PrintImage(ByVal printer As IntPtr, ByVal filePath As String, ByVal scaleMode As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function DefineNVImage(ByVal printer As IntPtr, ByVal imagePath As String, ByVal kc1 As Byte, ByVal kc2 As Byte) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function PrintNVImage(ByVal printer As IntPtr, ByVal kc1 As Byte, ByVal kc2 As Byte) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function DefineDownloadedImage(ByVal printer As IntPtr, ByVal imagePath As String, ByVal kc1 As Byte, ByVal kc2 As Byte) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function PrintDownloadedImage(ByVal printer As IntPtr, ByVal kc1 As Byte, ByVal kc2 As Byte) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function DefineBufferedImage(ByVal printer As IntPtr, ByVal imagePath As String) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function PrintBufferedImage(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, charSet:=charSet, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function DeleteAllNVImages(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function GetFirmwareVersion(ByVal printer As IntPtr, ByVal version As Integer(), ByVal versionLen As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function GetCashDrawerState(ByVal printer As IntPtr, ByVal drawerState As Integer()) As Integer
        End Function

        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)> _
        Private Shared Function ClearBuffer(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function ReadData(ByVal printer As IntPtr, ByVal getData As Byte(), ByVal readDataNum As Integer, ByRef getReadDataNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function WriteData(ByVal printer As IntPtr, ByVal setData As Byte(), ByVal setDataNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetPaperFeedLinesNumber(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetHeadEnergizingStrokesNumber(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function ClearPrinterMileage(ByVal printer As IntPtr, ByVal clearType As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetAutocutterOperationsNumber(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetPrinterOperationPeriod(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetOverTemperatureErrorReportNumber(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetPrinterPointsNumber(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetCutterErrorNumber(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetPowerOnOpenCoverNumber(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetHalfCutNumber(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetTotalCutNumber(ByVal printer As IntPtr, ByRef getReadNum As Integer) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function ClearPrinterMileage2(ByVal printer As IntPtr) As Integer
        End Function
        <DllImport(HPRTDIR, CallingConvention:=CallingConvention.StdCall)>
        Private Shared Function GetPrinterSN(ByVal printer As IntPtr, ByVal getSN As Byte(), ByRef getSNDataNum As Integer) As Integer
        End Function


        <DllImport(HPRTDIR)> _
        Private Shared Function PrintTwoQRCode(ByVal printer As IntPtr, ByVal data1 As String, ByVal width1 As Integer, ByVal hAlign1 As Integer, ByVal vAlign1 As Integer, ByVal data2 As String, _
   ByVal width2 As Integer, ByVal hAlign2 As Integer, ByVal vAlign2 As Integer) As Integer
        End Function

        Private printer As IntPtr
        Private langid As Integer = 0
        Private E_SUCCESS As Integer = Constants.E_SUCCESS
        Private E_INVALID_PARAMETER As Integer = Constants.E_INVALID_PARAMETER
        Private state As New PrinterState()
        Private modelname As String = ""
        Public Sub New(ByVal model As String)
            Dim result As Integer = E_SUCCESS
            printer = IntPtr.Zero
            result = PrinterCreator(printer, model)
            If E_SUCCESS <> result Then
                Dim errorMsg As String = DemFormatError(result)
                printer = IntPtr.Zero
                Throw New Exception(errorMsg)
            Else

                modelname = model
            End If
        End Sub
        Public Function DemFormatError(ByVal error_no As Integer) As String
            Dim temp As Byte() = New Byte(512) {}
            FormatError(error_no, langid, temp, 0, 512)
            Return System.Text.Encoding.[Default].GetString(temp, 0, 512)
        End Function
        Public Property Model() As String
            Get
                Return modelname
            End Get
            Set(ByVal value As String)
                If value.ToUpper().Trim() <> modelname.ToUpper().Trim() Then
                    Dim p As IntPtr = IntPtr.Zero
                    If Constants.E_SUCCESS = PrinterCreator(p, value) Then
                        PrinterDestroy(printer)
                        printer = p
                        modelname = value
                    End If
                End If
            End Set
        End Property
        Public Function ChangeModel(ByVal modelName As String) As Integer
            Dim result As Integer = Constants.E_SUCCESS
            Return result
        End Function
        Public Function DemPortOpen(ByVal uri As String) As Integer
            If printer <> IntPtr.Zero Then
                Return PortOpen(printer, uri)
            Else
                Return Constants.E_BAD_HANDLE
            End If
        End Function
        Public Function DemPortClose() As Integer
            Dim result As Integer = E_SUCCESS
            result = PortClose(printer)
            Return result
        End Function
        Public Function Initialize() As Integer
            Return PrinterInitialize(printer)
        End Function
        Public Function DemFeedLine(ByVal lines As Integer) As Integer
            Return FeedLine(printer, lines)
        End Function
        Public Function DemSetAlign(ByVal align As Integer) As Integer
            Return SetAlign(printer, align)
        End Function
        Public Function DemPrintText(ByVal text As String, ByVal alignment As Integer, ByVal attribute As Integer, ByVal textsize As Integer) As Integer
            Dim len As Integer = text.Length
            'Dim data As Byte() = Encoding.Unicode.GetBytes(text)
            Dim data As Byte() = Encoding.ASCII.GetBytes(text)
            Return PrintText(printer, data, alignment, attribute, textsize)
        End Function
        Public Function DemPrintTextS(ByVal text As String) As Integer
            Dim len As Integer = text.Length
            'Dim data As Byte() = Encoding.Unicode.GetBytes(text)
            Dim data As Byte() = Encoding.ASCII.GetBytes(text)
            Return PrintTextS(printer, data)
        End Function
        Public Function DemPrintBarCode(ByVal bcType As Integer, ByVal bcData As String, ByVal width As Integer, ByVal height As Integer, ByVal alignment As Integer, ByVal hriPosition As Integer) As Integer
            Return PrintBarCode(printer, bcType, bcData, width, height, alignment, hriPosition)
        End Function
        Public Function DemPrintSymbol(ByVal type As Integer, ByVal data As String, ByVal errLevel As Integer, ByVal width As Integer, ByVal height As Integer, ByVal alignment As Integer) As Integer
            Return PrintSymbol(printer, type, data, errLevel, width, height, alignment)
        End Function
        Public Function DemCutPaper(ByVal cutMode As Integer, ByVal distance As Integer) As Integer
            Return CutPaper(printer, cutMode, distance)
        End Function
        Public Function DemOpenCashDrawer(ByVal pinMode As Integer, ByVal onTime As Integer, ByVal offTime As Integer) As Integer
            Return OpenCashDrawer(printer, pinMode, onTime, offTime)
        End Function
        Public Function DemSelectStandardMode() As Integer
            Return SelectStandardMode(printer)
        End Function
        Public Function DemSetTextBold(ByVal printer As IntPtr, ByVal bold As Integer) As Integer
            Return SetTextBold(printer, bold)
        End Function
        Public Function DemSetTextFont(ByVal printer As IntPtr, ByVal Font As Integer) As Integer
            Return SetTextFont(printer, Font)
        End Function
        Public Function DemSelectPageMode() As Integer
            Return SelectPageMode(printer)
        End Function
        Public Function DemSetPageModePrintArea(ByVal horizontal As Integer, ByVal vertical As Integer, ByVal width As Integer, ByVal height As Integer) As Integer
            Return SetPrintAreaInPageMode(printer, horizontal, vertical, width, height)
        End Function
        Public Function DemCancelPrintData() As Integer
            Return CancelPrintDataInPageMode(printer)
        End Function
        Public Function DemSetPageModePrintDirection(ByVal direction As Integer) As Integer
            Return SelectPrintDirectionInPageMode(printer, direction)
        End Function
        Public Function DemSetPageModeHorizontalPosition(ByVal position As Integer) As Integer
            Return SetAbsolutePrintPosition(printer, position)
        End Function
        Public Function DemSetPageModeVerticalPosition(ByVal position As Integer) As Integer
            Return SetAbsoluteVerticalPrintPositionInPageMode(printer, position)
        End Function
        Public Function DemPrintAndReturnStandardMode() As Integer
            Return PrintAndReturnStandardMode(printer)
        End Function
        Public Function DemPositionNextLabel() As Integer
            Return PositionNextLabel(printer)
        End Function
        Public Function DemPrintDataInPageMode() As Integer
            Return PrintDataInPageMode(printer)
        End Function
        Public Function DemGetPrinterState(ByRef printerState As UInteger) As Integer
            Return GetPrinterState(printer, printerState)
        End Function
        Public Function DemSetHorizontalAndVerticalMotionUnits(ByVal printer As IntPtr, ByVal horizaotal As Integer, ByVal vertical As Integer) As Integer
            Return SetHorizontalAndVerticalMotionUnits(printer, horizaotal, vertical)
        End Function
        Public Function DemSetCodePage(ByVal printer As IntPtr, ByVal codepage As Integer, ByVal type As Integer) As Integer
            Return SetCodePage(printer, codepage, type)
        End Function
        Public Function DemSetBuzzer(ByVal printer As IntPtr, ByVal enable As Integer) As Integer
            Return SetBuzzer(printer, enable)
        End Function
        Public Function DemSetInternationalCharacter(ByVal printer As IntPtr, ByVal characterSet As Integer) As Integer
            Return SetInternationalCharacter(printer, characterSet)
        End Function
        Public Function DemSetPrintSpeed(ByVal printer As IntPtr, ByVal speed As Integer) As Integer
            Return SetPrintSpeed(printer, speed)
        End Function
        Public Function DemDefineNVImageCompatible(ByVal fileList As String(), ByVal ImageQty As Integer) As Integer
            Return DefineNVImageCompatible(printer, fileList, ImageQty)
        End Function
        Public Function DemPrintNVImageCompatible(ByVal imageNo As Integer, ByVal scaleMode As Integer) As Integer
            Return PrintNVImageCompatible(printer, imageNo, scaleMode)
        End Function
        Public Function DemDefineDownloadedImageCompatible(ByVal imagePath As String) As Integer
            Return DefineDownloadedImageCompatible(printer, imagePath)
        End Function
        Public Function DemPrintDownloadedImageCompatible(ByVal scaleMode As Integer) As Integer
            Return PrintDownloadedImageCompatible(printer, scaleMode)
        End Function
        Public Function DemPrintImage(ByVal imagePath As String, ByVal scaleMode As Integer) As Integer
            Return PrintImage(printer, imagePath, scaleMode)
        End Function
        Public Function DemDefineNVImage(ByVal imagePath As String, ByVal kc1 As Byte, ByVal kc2 As Byte) As Integer
            Return DefineNVImage(printer, imagePath, kc1, kc2)
        End Function
        Public Function DemPrintNVImage(ByVal kc1 As Byte, ByVal kc2 As Byte) As Integer
            Return PrintNVImage(printer, kc1, kc2)
        End Function
        Public Function DemDefineDownloadedImage(ByVal imagePath As String, ByVal kc1 As Byte, ByVal kc2 As Byte) As Integer
            Return DefineDownloadedImage(printer, imagePath, kc1, kc2)
        End Function
        Public Function DemPrintDownloadedImage(ByVal kc1 As Byte, ByVal kc2 As Byte) As Integer
            Return PrintDownloadedImage(printer, kc1, kc2)
        End Function
        Public Function DemDefineBufferedImage(ByVal imagePath As String) As Integer
            Return DefineBufferedImage(printer, imagePath)
        End Function
        Public Function DemPrintBufferedImage() As Integer
            Return PrintBufferedImage(printer)
        End Function
        Public Function DemDeleteAllNVImages(ByVal printer As IntPtr) As Integer
            Return DeleteAllNVImages(printer)
        End Function
        Public Function DemGetFirmwareVersion(ByVal Version As Integer()) As Integer
            Return GetFirmwareVersion(printer, Version, Version.Length)
        End Function
        Public Function DemGetCashDrawerState(ByVal printer As IntPtr, ByVal drawerState As Integer()) As Integer
            Return GetCashDrawerState(printer, drawerState)
        End Function
        Public Function DemClearBuffer(ByVal printer As IntPtr) As Integer
            Return ClearBuffer(printer)
        End Function
        Public Function DemReadData(ByVal getData As Byte(), ByVal readDataNum As Integer, ByRef getReadDataNum As Integer) As Integer
            Return ReadData(printer, getData, readDataNum, getReadDataNum)
        End Function
        Public Function DemWriteData(ByVal getData As Byte(), ByVal readDataNum As Integer) As Integer
            Return WriteData(printer, getData, readDataNum)
        End Function
        Public Function DemGetPaperFeedLinesNumber(ByRef getReadNum As Integer) As Integer
            Return GetPaperFeedLinesNumber(printer, getReadNum)
        End Function
        Public Function DemGetHeadEnergizingStrokesNumber(ByRef getReadNum As Integer) As Integer
            Return GetHeadEnergizingStrokesNumber(printer, getReadNum)
        End Function
        Public Function DemClearPrinterMileage(ByVal clearType As Integer) As Integer
            Return ClearPrinterMileage(printer, clearType)
        End Function
        Public Function DemGetAutocutterOperationsNumber(ByRef getReadNum As Integer) As Integer
            Return GetAutocutterOperationsNumber(printer, getReadNum)
        End Function
        Public Function DemGetPrinterOperationPeriod(ByRef getReadNum As Integer) As Integer
            Return GetPrinterOperationPeriod(printer, getReadNum)
        End Function
        Public Function DemGetOverTemperatureErrorReportNumber(ByRef getReadNum As Integer) As Integer
            Return GetOverTemperatureErrorReportNumber(printer, getReadNum)
        End Function
        Public Function DemGetPrinterPointsNumber(ByRef getReadNum As Integer) As Integer
            Return GetPrinterPointsNumber(printer, getReadNum)
        End Function
        Public Function DemGetCutterErrorNumber(ByRef getReadNum As Integer) As Integer
            Return GetCutterErrorNumber(printer, getReadNum)
        End Function
        Public Function DemGetPowerOnOpenCoverNumber(ByRef getReadNum As Integer) As Integer
            Return GetPowerOnOpenCoverNumber(printer, getReadNum)
        End Function
        Public Function DemGetHalfCutNumber(ByRef getReadNum As Integer) As Integer
            Return GetHalfCutNumber(printer, getReadNum)
        End Function
        Public Function DemGetTotalCutNumber(ByRef getReadNum As Integer) As Integer
            Return GetTotalCutNumber(printer, getReadNum)
        End Function
        Public Function DemClearPrinterMileage2() As Integer
            Return ClearPrinterMileage2(printer)
        End Function
        Public Function DemGetPrinterSN(ByVal getSN As Byte(), ByRef getSNDataNum As Integer) As Integer
            Return GetPrinterSN(printer, getSN, getSNDataNum)
        End Function
        Public Function DemPrintTwoQRCode(ByVal data1 As String, ByVal width1 As Integer, ByVal hAlign1 As Integer, ByVal vAlign1 As Integer, ByVal data2 As String, ByVal width2 As Integer, _
     ByVal hAlign2 As Integer, ByVal vAlign2 As Integer) As Integer
            Return PrintTwoQRCode(printer, data1, width1, hAlign1, vAlign1, data2, _
             width2, hAlign2, vAlign2)
        End Function
        Public Function GetState(ByRef printerState As PrinterState) As Integer
            Dim s As UInteger = 0
            Dim result As Integer = E_SUCCESS
            result = GetPrinterState(printer, s)
            If E_SUCCESS = result Then
                printerState.State = s
                state.State = s
            Else
                printerState.State = printerState.State Or printerState.STS_ERROR
                state.State = state.State Or printerState.STS_ERROR
            End If
            Return result
        End Function
        Public Function DemDirectIO(ByVal writedata As Byte(), ByVal readdata As Byte(), ByVal readnum As Integer, ByRef readednum As Integer) As Integer
            If writedata Is Nothing OrElse writedata.Length = 0 Then
                MessageBox.Show("No data to write!")
                Return E_INVALID_PARAMETER
            End If
            If True Then
                Dim readedcnt As Integer = 0
                Dim errorno As Integer = DirectIO(printer, writedata, writedata.Length, readdata, readnum, readedcnt)
                If E_SUCCESS = errorno Then
                    readednum = readedcnt
                End If
                Return errorno
            End If
            Return 0
        End Function
        Public Sub PrintText2Image(ByVal path As String, ByVal text As String, ByVal font_mode As FontStyle, ByVal font_size As Integer)
            Dim bmp_height As Integer = font_size * 2
            Dim bmp As System.Drawing.Bitmap = New Bitmap(384, bmp_height)
            Dim g As Graphics = Graphics.FromImage(bmp)
            g.Clear(Color.White)
            Dim brush As New SolidBrush(Color.Black)
            Dim font As New Font(FontFamily.GenericSerif, font_size, font_mode)
            g.DrawString(text, font, brush, 0, 5)
            bmp.Save(path, System.Drawing.Imaging.ImageFormat.Bmp)
            font.Dispose()
            g.Dispose()
            PrintImage(printer, path, Constants.PRINT_IMAGE_NORMAL)
        End Sub
     
    

        Private Function DirectIO(ByVal printer As IntPtr, ByVal writedata As Byte(), ByVal p3 As Object, ByVal readdata As Byte(), ByVal p5 As Object, ByVal readedcnt As UInteger) As Integer
            Throw New NotImplementedException
        End Function

    End Class
End Namespace
