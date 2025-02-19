// stylesheet.js

import { StyleSheet } from 'react-native';


export const bootstrap = StyleSheet.create({

  // Margin
  mt1: { marginTop: 4 },
  mt2: { marginTop: 8 },
  mt3: { marginTop: 16 },
  mb1: { marginBottom: 4 },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 16 },
  my1: { marginVertical: 4 },
  my2: { marginVertical: 8 },
  my3: { marginVertical: 16 },
  mx1: { marginHorizontal: 4 },
  mx2: { marginHorizontal: 8 },
  mx3: { marginHorizontal: 16 },

  // Padding
  p1: { padding: 4 },
  p2: { padding: 8 },
  p3: { padding: 16 },
  pt1: { paddingTop: 4 },
  pt2: { paddingTop: 8 },
  pt3: { paddingTop: 16 },
  py1: { paddingVertical: 4 },
  py2: { paddingVertical: 8 },
  py3: { paddingVertical: 16 },
  px1: { paddingHorizontal: 4 },
  px2: { paddingHorizontal: 8 },
  px3: { paddingHorizontal: 16 },

  // Flex
  flexRow: { flexDirection: 'row' },
  flexCol: { flexDirection: 'column' },
  flexWrap: { flexWrap: 'wrap' },
  justifyCenter: { justifyContent: 'center' },
  alignCenter: { alignItems: 'center' },
  flex1: { flex: 1 },

  // Layout
  container: {
    flex: 1,
    padding: 15,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardBody: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 10,
  },

  // Typography
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
  },

  // Buttons
  btn: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#007bff',
  },
  btnSuccess: {
    backgroundColor: '#28a745',
  },
  btnDanger: {
    backgroundColor: '#dc3545',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
  },

  // Forms
  formGroup: {
    marginBottom: 15,
  },
  formControl: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  formLabel: {
    fontSize: 16,
    marginBottom: 5,
  },

  // Utils
  textCenter: {
    alignItems: 'center',
  },
  mb1: {
    marginBottom: 4,
  },
  mb2: {
    marginBottom: 8,
  },
  mb3: {
    marginBottom: 16,
  },
  mt1: {
    marginTop: 4,
  },
  mt2: {
    marginTop: 8,
  },
  mt3: {
    marginTop: 16,
  },

  // Form
  formGroup: {
    marginBottom: 15,
  },
  formControl: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  formText: {
    marginTop: 4,
    fontSize: 14,
    color: '#6c757d'
  },
});

