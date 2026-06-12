import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { Button } from '../../components/Button';
import { api } from '../../api/apiClient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const REPORT_TYPES = [
  { id: 'sessoes', title: 'Sessões e Atendimentos', desc: 'Sessões por período, sala e status', icon: 'calendar-outline' },
  { id: 'estagiarios', title: 'Desempenho de Estagiários', desc: 'Frequência, faltas e carga horária', icon: 'school-outline' },
  { id: 'pacientes', title: 'Cadastro de Pacientes', desc: 'Lista de pacientes, dados de contato e responsável', icon: 'people-outline' },
];

export function RelatoriosScreen() {
  const navigation = useNavigation<any>();
  
  const [selectedReport, setSelectedReport] = useState('sessoes');
  const [loading, setLoading] = useState(false);

  // Filtros
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Padrão: últimos 30 dias
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusSessao, setStatusSessao] = useState('ALL');
  const [tipoAtendimento, setTipoAtendimento] = useState('ALL');
  const [statusPaciente, setStatusPaciente] = useState('ALL');

  const fetchReportData = async () => {
    try {
      let endpoint = '';
      const params: any = {};

      if (selectedReport === 'sessoes') {
        endpoint = '/relatorios/sessoes';
        params.dataInicio = dataInicio;
        params.dataFim = dataFim;
        if (statusSessao !== 'ALL') params.status = statusSessao;
      } else if (selectedReport === 'estagiarios') {
        endpoint = '/relatorios/estagiarios';
        params.dataInicio = dataInicio;
        params.dataFim = dataFim;
      } else if (selectedReport === 'pacientes') {
        endpoint = '/relatorios/pacientes';
        if (tipoAtendimento !== 'ALL') params.tipoAtendimento = tipoAtendimento;
        if (statusPaciente !== 'ALL') params.status = statusPaciente;
      }

      const response = await api.get(endpoint, { params });
      return response.data;
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', e.response?.data?.error || 'Erro ao carregar dados do relatório.');
      return null;
    }
  };

  // ─── GERADOR DE EXCEL (CSV FORMATADO) ──────────────────────────────────────
  const handleExportExcel = async () => {
    setLoading(true);
    const data = await fetchReportData();
    setLoading(false);
    if (!data || data.length === 0) {
      return Alert.alert('Aviso', 'Nenhum dado encontrado para exportar.');
    }

    let csvContent = '\uFEFF'; // Adiciona UTF-8 BOM para o Excel abrir com acentuação correta
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (selectedReport === 'sessoes') {
      headers = ['Data', 'Horário', 'Sala', 'Terapeuta (Estagiário)', 'Paciente(s)', 'Status', 'Notas'];
      rows = data.map((item: any) => [
        item.data,
        item.horario,
        item.sala,
        item.estagiario,
        item.pacientes,
        item.status,
        item.notas
      ]);
      filename = `relatorio-sessoes_${dataInicio}_a_${dataFim}.csv`;
    } else if (selectedReport === 'estagiarios') {
      headers = ['Estagiário', 'Matrícula', 'CH Semanal', 'Total de Sessões', 'Realizadas', 'Faltas', 'Canceladas', 'Taxa de Presença', 'Ativo'];
      rows = data.map((item: any) => [
        item.nome,
        item.matricula,
        String(item.cargaHorariaSemanal),
        String(item.totalSessao),
        String(item.realizadas),
        String(item.faltas),
        String(item.canceladas),
        item.taxaPresenca,
        item.ativo
      ]);
      filename = `relatorio-estagiarios_${dataInicio}_a_${dataFim}.csv`;
    } else if (selectedReport === 'pacientes') {
      headers = ['Nome', 'Data de Nascimento', 'CPF', 'Telefone', 'Tipo de Atendimento', 'Status', 'Responsável (Contato)'];
      rows = data.map((item: any) => [
        item.nome,
        item.dataNascimento,
        item.cpf,
        item.telefone,
        item.tipoAtendimento,
        item.status,
        item.responsavel
      ]);
      filename = `relatorio-pacientes.csv`;
    }

    // Unir headers e linhas usando Ponto e Vírgula (padrão Excel brasileiro) e aspas duplas nas strings
    csvContent += headers.map(h => `"${h}"`).join(';') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';') + '\n';
    });

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // No celular: Grava em arquivo temporário e abre o modal de compartilhamento nativo
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível gerar o arquivo Excel.');
    }
  };

  // ─── GERADOR DE PDF E IMPRESSÃO ──────────────────────────────────────────
  const handleExportPDF = async () => {
    setLoading(true);
    const data = await fetchReportData();
    setLoading(false);
    if (!data || data.length === 0) {
      return Alert.alert('Aviso', 'Nenhum dado encontrado para gerar o PDF.');
    }

    let htmlTitle = '';
    let summaryHTML = '';
    let tableHeadersHTML = '';
    let tableRowsHTML = '';

    const todayStr = new Date().toLocaleDateString('pt-BR');

    if (selectedReport === 'sessoes') {
      htmlTitle = 'Relatório de Sessões e Atendimentos';
      
      const total = data.length;
      const realizadas = data.filter((d: any) => d.status === 'CONCLUIDA' || d.status === 'REALIZADA').length;
      const faltas = data.filter((d: any) => d.status === 'FALTA').length;
      const canceladas = data.filter((d: any) => d.status === 'CANCELADA').length;

      summaryHTML = `
        <div class="summary-container">
          <div class="summary-card"><strong>Sessões Filtradas:</strong> ${total}</div>
          <div class="summary-card"><strong>Realizadas:</strong> ${realizadas}</div>
          <div class="summary-card"><strong>Faltas:</strong> ${faltas}</div>
          <div class="summary-card"><strong>Canceladas:</strong> ${canceladas}</div>
        </div>
      `;

      tableHeadersHTML = `
        <tr>
          <th>Data</th>
          <th>Horário</th>
          <th>Sala</th>
          <th>Estagiário (Terapeuta)</th>
          <th>Paciente</th>
          <th>Status</th>
        </tr>
      `;

      tableRowsHTML = data.map((item: any) => `
        <tr>
          <td>${item.data.split('-').reverse().join('/')}</td>
          <td>${item.horario}</td>
          <td>${item.sala}</td>
          <td>${item.estagiario}</td>
          <td>${item.pacientes}</td>
          <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
        </tr>
      `).join('');

    } else if (selectedReport === 'estagiarios') {
      htmlTitle = 'Relatório de Frequência de Estagiários';

      const total = data.length;
      summaryHTML = `
        <div class="summary-container">
          <div class="summary-card"><strong>Total Estagiários:</strong> ${total}</div>
        </div>
      `;

      tableHeadersHTML = `
        <tr>
          <th>Estagiário</th>
          <th>Matrícula</th>
          <th>CH</th>
          <th>Sessões</th>
          <th>Realizadas</th>
          <th>Faltas</th>
          <th>Presença (%)</th>
          <th>Ativo</th>
        </tr>
      `;

      tableRowsHTML = data.map((item: any) => `
        <tr>
          <td><strong>${item.nome}</strong></td>
          <td>${item.matricula}</td>
          <td>${item.cargaHorariaSemanal}h</td>
          <td>${item.totalSessao}</td>
          <td>${item.realizadas}</td>
          <td>${item.faltas}</td>
          <td><strong>${item.taxaPresenca}</strong></td>
          <td>${item.ativo}</td>
        </tr>
      `).join('');

    } else if (selectedReport === 'pacientes') {
      htmlTitle = 'Relatório de Cadastro de Pacientes';

      const total = data.length;
      const ativos = data.filter((p: any) => p.status === 'Ativo').length;
      const inativos = data.filter((p: any) => p.status === 'Inativo').length;

      summaryHTML = `
        <div class="summary-container">
          <div class="summary-card"><strong>Total Pacientes:</strong> ${total}</div>
          <div class="summary-card"><strong>Ativos:</strong> ${ativos}</div>
          <div class="summary-card"><strong>Inativos:</strong> ${inativos}</div>
        </div>
      `;

      tableHeadersHTML = `
        <tr>
          <th>Paciente</th>
          <th>Nascimento</th>
          <th>CPF</th>
          <th>Telefone</th>
          <th>Tipo Atendimento</th>
          <th>Status</th>
          <th>Responsável</th>
        </tr>
      `;

      tableRowsHTML = data.map((item: any) => `
        <tr>
          <td><strong>${item.nome}</strong></td>
          <td>${item.dataNascimento.split('-').reverse().join('/')}</td>
          <td>${item.cpf}</td>
          <td>${item.telefone}</td>
          <td>${item.tipoAtendimento}</td>
          <td><span class="status-badge status-${item.status === 'Ativo' ? 'realizada' : 'cancelada'}">${item.status}</span></td>
          <td style="font-size: 11px;">${item.responsavel}</td>
        </tr>
      `).join('');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #1565C0; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 32px; color: #0D47A1; font-weight: bold; margin-bottom: 4px; }
          .title { font-size: 20px; font-weight: bold; color: #333; margin-top: 10px; }
          .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
          .summary-container { display: flex; gap: 15px; margin-bottom: 20px; }
          .summary-card { flex: 1; background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; font-size: 13px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background-color: #1565C0; color: #FFFFFF; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #1565C0; }
          td { padding: 9px 10px; border-bottom: 1px solid #E2E8F0; }
          tr:nth-child(even) { background-color: #F8FAFC; }
          .status-badge { display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
          .status-realizada, .status-concluida { background-color: #DCFCE7; color: #15803D; }
          .status-falta { background-color: #FEF3C7; color: #D97706; }
          .status-cancelada { background-color: #FEE2E2; color: #B91C1C; }
          .footer { margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 10px; text-align: center; font-size: 10px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Ψ Psicologia SEP</div>
          <div class="subtitle">Clínica Escola de Psicologia · Sistema de Gestão Clínica</div>
          <div class="title">${htmlTitle}</div>
          <div class="subtitle">Gerado em: ${todayStr} ${selectedReport !== 'pacientes' ? `· Período: ${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}` : ''}</div>
        </div>

        ${summaryHTML}

        <table>
          <thead>
            ${tableHeadersHTML}
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>

        <div class="footer">
          Psicologia SEP · Relatório Oficial Clínico · Página 1 de 1
        </div>
      </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        // Na Web: abre a janela de impressão do navegador com o HTML estilizado
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      } else {
        // No celular: renderiza o PDF e compartilha
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível gerar o PDF do relatório.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exportar Relatórios</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>1. Selecione o Tipo de Relatório</Text>
        
        {REPORT_TYPES.map(report => {
          const isActive = selectedReport === report.id;
          return (
            <TouchableOpacity
              key={report.id}
              style={[styles.reportCard, isActive && styles.reportCardActive]}
              onPress={() => setSelectedReport(report.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                <Ionicons name={report.icon as any} size={24} color={isActive ? '#FFF' : colors.primary} />
              </View>
              <View style={styles.reportCardContent}>
                <Text style={[styles.reportCardTitle, isActive && styles.textWhite]}>{report.title}</Text>
                <Text style={[styles.reportCardDesc, isActive && styles.textWhiteAlpha]}>{report.desc}</Text>
              </View>
              {isActive && <Ionicons name="checkmark-circle" size={20} color="#FFF" />}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionTitle}>2. Filtros e Parâmetros</Text>

        <View style={styles.filtersCard}>
          {/* Filtros de data por período (Apenas para Sessões e Estagiários) */}
          {selectedReport !== 'pacientes' && (
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.fieldLabel}>Data Inicial *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="AAAA-MM-DD"
                  value={dataInicio}
                  onChangeText={setDataInicio}
                />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.fieldLabel}>Data Final *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="AAAA-MM-DD"
                  value={dataFim}
                  onChangeText={setDataFim}
                />
              </View>
            </View>
          )}

          {/* Filtros específicos de Sessões */}
          {selectedReport === 'sessoes' && (
            <View style={styles.filterRow}>
              <Text style={styles.fieldLabel}>Status das Sessões</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {[
                  { id: 'ALL', name: 'Todas' },
                  { id: 'CONCLUIDA', name: 'Realizadas' },
                  { id: 'FALTA', name: 'Faltas' },
                  { id: 'CANCELADA', name: 'Canceladas' }
                ].map(opt => {
                  const active = statusSessao === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setStatusSessao(opt.id)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Filtros específicos de Pacientes */}
          {selectedReport === 'pacientes' && (
            <>
              <View style={styles.filterRow}>
                <Text style={styles.fieldLabel}>Tipo de Atendimento</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {[
                    { id: 'ALL', name: 'Todos' },
                    { id: 'ADULTO', name: 'Adulto' },
                    { id: 'CRIANCA', name: 'Infantil' },
                    { id: 'CASAL', name: 'Casal' }
                  ].map(opt => {
                    const active = tipoAtendimento === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setTipoAtendimento(opt.id)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={[styles.filterRow, { marginTop: 14 }]}>
                <Text style={styles.fieldLabel}>Status do Cadastro</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {[
                    { id: 'ALL', name: 'Todos' },
                    { id: 'ATIVO', name: 'Ativos' },
                    { id: 'INATIVO', name: 'Inativos' }
                  ].map(opt => {
                    const active = statusPaciente === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setStatusPaciente(opt.id)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Botões de Ações de Exportação */}
      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.excelButton} onPress={handleExportExcel}>
              <Ionicons name="document-text-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Exportar Excel (CSV)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pdfButton} onPress={handleExportPDF}>
              <Ionicons name="print-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Exportar PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F5F8' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF', elevation: 2 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.textHeader },
  container: { padding: 20, paddingBottom: 150 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 14 },
  reportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  reportCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconBoxActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  reportCardContent: { flex: 1 },
  reportCardTitle: { fontSize: 16, fontWeight: '700', color: colors.textHeader, marginBottom: 4 },
  reportCardDesc: { fontSize: 12, color: colors.textSecondary },
  textWhite: { color: '#FFF' },
  textWhiteAlpha: { color: 'rgba(255,255,255,0.75)' },
  filtersCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateCol: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 10, padding: 12, fontSize: 14, color: colors.textHeader },
  filterRow: { marginTop: 6 },
  chipsScroll: { gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#F1F5F9' },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  footer: { backgroundColor: '#FFF', padding: 20, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 12 },
  buttonGroup: { gap: 12 },
  excelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 16, elevation: 2 },
  pdfButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 16, elevation: 2 },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '700' }
});
