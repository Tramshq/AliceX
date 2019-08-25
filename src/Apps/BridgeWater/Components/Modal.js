import Modal from "react-native-modal";
import React, {Component} from "react";
import { StyleSheet } from "react-native";

export default class ModalComponent extends Component<Props> {
  state = {
    isVisible: false,
    pin: ''
  };

  render() {
    return (
      <Modal isVisible={this.props.isVisible} onBackdropPress={this.props.onBackdropPress} style={styles.modal} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
        {this.props.children}
      </Modal>
    )
  }

}
const styles = StyleSheet.create({
  modal: {
    margin: 0,
  },
});
